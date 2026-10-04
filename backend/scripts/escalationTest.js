// Tests escalation and contact messages. Run with:  node scripts/escalationTest.js
require("dotenv").config();
const { io } = require("socket.io-client");

const BASE = "http://localhost:5000";
const STEP = Number(process.env.ESCALATION_SECONDS) || 60;
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
    if (STEP > 10) {
        console.log("Set ESCALATION_SECONDS=3 in backend/.env, restart the server, and run this again.");
        process.exit(1);
    }

    const woman = await connect(await login("9876543210", "user"));
    const near = await connect(await login("9000000001", "volunteer")); // within 1 km
    const medium = await connect(await login("9000000006", "volunteer")); // about 2 km

    let nearAlert = null;
    let mediumAlert = null;
    let contacts = null;
    let expanded = null;
    let unanswered = null;
    let mediumClaimed = null;
    near.on("alert:new", (d) => (nearAlert = d));
    medium.on("alert:new", (d) => (mediumAlert = d));
    medium.on("alert:claimed", (d) => (mediumClaimed = d));
    woman.on("sos:contacts", (d) => (contacts = d));
    woman.on("alert:expanded", (d) => (expanded = d));
    woman.on("alert:unanswered", (d) => (unanswered = d));

    // The woman sends an SOS from Indiranagar, Bangalore. Nobody accepts.
    woman.emit("sos:trigger", { lat: 12.9784, lng: 77.6408 });
    await wait(1500);

    console.log(
        nearAlert && !mediumAlert
            ? "TEST 1 PASSED: at first only the volunteer within 1 km was alerted"
            : "TEST 1 FAILED: nearAlert=" + !!nearAlert + ", mediumAlert=" + !!mediumAlert
    );
    console.log(
        contacts && contacts.count >= 1
            ? `TEST 2 PASSED: ${contacts.count} trusted contact(s) were messaged (see the SMS lines in the server terminal)`
            : "TEST 2 FAILED: " + JSON.stringify(contacts)
    );

    // Wait for step 1 of the escalation
    await wait(STEP * 1000);
    console.log(
        mediumAlert && expanded && expanded.notifiedCount >= 1
            ? `TEST 3 PASSED: nobody accepted, so the search widened and ${expanded.notifiedCount} more volunteer(s) were alerted`
            : "TEST 3 FAILED: expanded=" + JSON.stringify(expanded)
    );
    console.log(
        !unanswered
            ? "TEST 4 PASSED: the woman is not told to call 112 yet"
            : "TEST 4 FAILED: told to call 112 too early"
    );

    // Wait for step 2 of the escalation
    await wait(STEP * 1000 + 1500);
    console.log(
        unanswered
            ? `TEST 5 PASSED: still nobody, so the woman was told: "${unanswered.message}"`
            : "TEST 5 FAILED: no call-112 message arrived"
    );

    // The alert is still open, so a volunteer can still join late
    medium.emit("alert:accept", { alertId: mediumAlert.alertId });
    await wait(1000);
    console.log(
        mediumClaimed
            ? "TEST 6 PASSED: the alert stayed open, and a late volunteer could still join"
            : "TEST 6 FAILED: a late volunteer could not join"
    );

    // Clean up: end the alert
    woman.emit("alert:status", { alertId: mediumAlert.alertId, status: "resolved" });
    await wait(600);

    [woman, near, medium].forEach((s) => s.disconnect());
    process.exit(0);
}

main().catch((err) => {
    console.error("Test crashed:", err.message);
    process.exit(1);
});