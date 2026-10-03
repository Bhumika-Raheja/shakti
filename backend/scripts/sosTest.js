// Tests the SOS flow: a user sends SOS, only the NEAR volunteer should be alerted.
// Run with:  node scripts/sosTest.js
const { io } = require("socket.io-client");

const BASE = "http://localhost:5000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(phone, role) {
    const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: "123456", role }),
    });
    const data = await res.json();
    return data.token;
}

function connect(token) {
    return new Promise((resolve, reject) => {
        const socket = io(BASE, { auth: { token } });
        socket.on("connected:ok", () => resolve(socket));
        socket.on("connect_error", reject);
    });
}

async function main() {
    const userSocket = await connect(await login("9876543210", "user"));
    const nearSocket = await connect(await login("9000000001", "volunteer"));
    const farSocket = await connect(await login("9000000002", "volunteer"));

    let nearGot = null;
    let farGot = null;
    let created = null;
    nearSocket.on("alert:new", (d) => (nearGot = d));
    farSocket.on("alert:new", (d) => (farGot = d));
    userSocket.on("sos:created", (d) => (created = d));
    userSocket.on("sos:error", (d) => console.log("SOS error:", d.message));

    // The user sends an SOS from Indiranagar, Bangalore
    userSocket.emit("sos:trigger", { lat: 12.9784, lng: 77.6408 });
    await wait(1500);

    console.log(
        nearGot
            ? `TEST 1 PASSED: near volunteer got the alert: "${nearGot.label}"`
            : "TEST 1 FAILED: near volunteer got nothing"
    );

    console.log(
        !farGot
            ? "TEST 2 PASSED: far volunteer was NOT alerted"
            : "TEST 2 FAILED: far volunteer got the alert"
    );
    console.log(
        created && created.notifiedCount === 4
            ? "TEST 3 PASSED: the user was told 4 volunteers were notified"
            : "TEST 3 FAILED: " + JSON.stringify(created)
    );

    [userSocket, nearSocket, farSocket].forEach((s) => s.disconnect());
    process.exit(0);
}

main().catch((err) => {
    console.error("Test crashed:", err.message);
    process.exit(1);
});