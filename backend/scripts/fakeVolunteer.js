// Pretends to be a volunteer, so you can test the app without a second phone.
// Run with:  node scripts/fakeVolunteer.js
// Or choose another seeded volunteer:  node scripts/fakeVolunteer.js 9000000003
const { io } = require("socket.io-client");

const BASE = process.env.BASE_URL || "http://localhost:5000";
const PHONE = process.argv[2] || "9000000001";

async function main() {
    const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: PHONE, otp: "123456", role: "volunteer" }),
    });
    const { token } = await res.json();
    const socket = io(BASE, { auth: { token } });
    let mover = null;

    socket.on("connected:ok", () =>
        console.log(`Volunteer ${PHONE} is online. Waiting for an SOS...`)
    );

    // An alert arrives: accept it after 3 seconds
    socket.on("alert:new", (a) => {
        console.log(`ALERT RECEIVED: ${a.label}`);
        setTimeout(() => socket.emit("alert:accept", { alertId: a.alertId }), 3000);
    });

    // We got in: walk toward the woman, and report progress
    socket.on("alert:claimed", (c) => {
        console.log(`Joined as ${c.isLead ? "LEAD" : "backup"}. She is at ${c.location.lat}, ${c.location.lng}`);
        const target = c.location;
        let lat = target.lat + 0.003;
        let lng = target.lng + 0.003;

        mover = setInterval(() => {
            lat += (target.lat - lat) / 6;
            lng += (target.lng - lng) / 6;
            socket.emit("location:update", { alertId: c.alertId, lat, lng });
        }, 2000);

        setTimeout(() => socket.emit("alert:status", { alertId: c.alertId, status: "on_the_way" }), 3000);
        setTimeout(() => socket.emit("alert:status", { alertId: c.alertId, status: "arrived" }), 25000);
    });

    socket.on("alert:error", (e) => console.log(`(could not join: ${e.message})`));
    socket.on("alert:cancelled", () => console.log("The woman cancelled the alert."));
    socket.on("alert:taken", () => console.log("Enough helpers were already on the way."));
    socket.on("alert:status", (s) => {
        if (s.status === "cancelled" || s.status === "resolved") {
            console.log(`Alert ${s.status}.`);
            if (mover) clearInterval(mover);
        }
    });
}

main().catch((err) => {
    console.error("Could not start:", err.message);
    process.exit(1);
});