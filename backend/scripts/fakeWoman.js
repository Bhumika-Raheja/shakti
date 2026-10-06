// Pretends to be the woman who sends an SOS, so you can test the volunteer app
// on your phone. Run with:  node scripts/fakeWoman.js
// Press Ctrl + C to cancel the alert ("I am safe").
const { io } = require("socket.io-client");

const BASE = "http://localhost:5000";
const HERE = { lat: 12.9784, lng: 77.6408 }; // Indiranagar, Bangalore

async function main() {
    const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9876543210", otp: "123456", role: "user" }),
    });
    const { token } = await res.json();
    const socket = io(BASE, { auth: { token } });
    let alertId = null;
    let ticker = null;

    function finish() {
        if (ticker) clearInterval(ticker);
        setTimeout(() => process.exit(0), 600);
    }

    socket.on("connected:ok", () => {
        console.log("Pretend woman is online. Sending an SOS...");
        socket.emit("sos:trigger", HERE);
    });

    socket.on("sos:created", (d) => {
        alertId = d.alertId;
        console.log(`SOS sent. ${d.notifiedCount} volunteer(s) alerted.`);
        // She shares her live location every 5 seconds
        ticker = setInterval(() => socket.emit("location:update", { alertId, ...HERE }), 5000);
    });

    socket.on("sos:error", (e) => {
        console.log(`SOS error: ${e.message}`);
        process.exit(1);
    });

    socket.on("alert:responders", (d) => {
        console.log("Helpers now:");
        d.responders.forEach((r) =>
            console.log(`  - ${r.name}${r.isLead ? " (lead)" : ""}: ${r.status}`)
        );
    });

    socket.on("alert:expanded", () => console.log("Nobody accepted yet: search widened to 3 km."));
    socket.on("alert:unanswered", () => console.log("Still nobody. She should call 112."));

    socket.on("alert:status", (s) => {
        console.log(`Alert status: ${s.status}`);
        if (s.status === "resolved" || s.status === "cancelled") finish();
    });

    // Ctrl + C = "I am safe, cancel alert"
    process.on("SIGINT", () => {
        if (alertId) {
            console.log("\nCancelling the alert...");
            socket.emit("alert:cancel", { alertId });
            setTimeout(() => process.exit(0), 800);
        } else {
            process.exit(0);
        }
    });
}

main().catch((err) => {
    console.error("Could not start:", err.message);
    process.exit(1);
});