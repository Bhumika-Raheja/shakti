// Tests the 3-helper flow. Run with:  node scripts/acceptTest.js
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
    const woman = await connect(await login("9876543210", "user"));

    // Four volunteers who are near the woman
    const near = [
        ["A", "9000000001"],
        ["B", "9000000003"],
        ["C", "9000000004"],
        ["D", "9000000005"],
    ];
    const helpers = [];
    for (const [name, phone] of near) {
        const socket = await connect(await login(phone, "volunteer"));
        const h = { name, socket, alertId: null, claimed: null, error: null };
        socket.on("alert:new", (d) => (h.alertId = d.alertId));
        socket.on("alert:claimed", (d) => (h.claimed = d));
        socket.on("alert:error", (d) => (h.error = d.message));
        helpers.push(h);
    }

    // One volunteer who is far away (never alerted)
    const far = await connect(await login("9000000002", "volunteer"));
    let farError = null;
    far.on("alert:error", (d) => (farError = d.message));

    // What the woman sees
    let list = null;
    let finalStatus = null;
    const locations = [];
    woman.on("alert:responders", (d) => (list = d.responders));
    woman.on("alert:status", (d) => (finalStatus = d.status));
    woman.on("location:update", (d) => locations.push(d));

    // The woman sends an SOS from Indiranagar, Bangalore
    woman.emit("sos:trigger", { lat: 12.9784, lng: 77.6408 });
    await wait(1500);

    const alertId = helpers[0].alertId;
    if (!alertId || !helpers.every((h) => h.alertId)) {
        console.log("SETUP PROBLEM: not all 4 near volunteers got the alert. Run: node scripts/seed.js");
        process.exit(1);
    }

    // All four near volunteers tap "Accept" at the same moment
    helpers.forEach((h) => h.socket.emit("alert:accept", { alertId }));
    await wait(1500);

    const winners = helpers.filter((h) => h.claimed);
    const losers = helpers.filter((h) => h.error);
    console.log(
        winners.length === 3 && losers.length === 1
            ? "TEST 1 PASSED: exactly 3 of 4 volunteers joined, 1 was turned away"
            : `TEST 1 FAILED: joined=${winners.length}, turned away=${losers.length}`
    );
    if (losers[0]) console.log(`         the 4th volunteer was told: "${losers[0].error}"`);

    console.log(
        list && list.length === 3 && list.filter((r) => r.isLead).length === 1
            ? "TEST 2 PASSED: the woman sees 3 helpers, with exactly one lead"
            : "TEST 2 FAILED: " + JSON.stringify(list)
    );

    // A volunteer who was never alerted tries to join
    far.emit("alert:accept", { alertId });
    await wait(600);
    console.log(
        farError
            ? `TEST 3 PASSED: far volunteer was refused: "${farError}"`
            : "TEST 3 FAILED: far volunteer was allowed to join"
    );

    // The lead drops out: the next helper should become the lead
    const oldLeadId = String(list.find((r) => r.isLead).volunteerId);
    const leadHelper = winners.find((h) => h.claimed.isLead);
    leadHelper.socket.emit("alert:leave", { alertId });
    await wait(800);

    const newLead = list.find((r) => r.isLead);
    const oldEntry = list.find((r) => String(r.volunteerId) === oldLeadId);
    console.log(
        newLead && String(newLead.volunteerId) !== oldLeadId && oldEntry.status === "left"
            ? `TEST 4 PASSED: the lead left, and a new lead took over (${newLead.name})`
            : "TEST 4 FAILED: " + JSON.stringify(list)
    );

    // A spot opened up: the volunteer who was turned away tries again
    const turnedAway = losers[0];
    turnedAway.claimed = null;
    turnedAway.error = null;
    turnedAway.socket.emit("alert:accept", { alertId });
    await wait(800);
    const activeNow = list.filter((r) => r.status !== "left").length;
    console.log(
        turnedAway.claimed && activeNow === 3
            ? "TEST 4B PASSED: a spot opened up, and the volunteer who was turned away joined"
            : `TEST 4B FAILED: claimed=${!!turnedAway.claimed}, active helpers=${activeNow}`
    );

    // A helper who is still on the alert shares live location
    const remaining = winners.filter((h) => h !== leadHelper);
    locations.length = 0;
    remaining[0].socket.emit("location:update", { alertId, lat: 12.9786, lng: 77.641 });
    await wait(600);
    console.log(
        locations.some((l) => l.from === "volunteer")
            ? "TEST 5 PASSED: the woman received a helper's live location"
            : "TEST 5 FAILED: no live location arrived"
    );

    // The helper who left tries to share location: it must be ignored
    locations.length = 0;
    leadHelper.socket.emit("location:update", { alertId, lat: 12.9787, lng: 77.6411 });
    await wait(600);
    console.log(
        locations.length === 0
            ? "TEST 6 PASSED: a helper who left can no longer send location"
            : "TEST 6 FAILED: location from a helper who left still arrived"
    );

    // The new lead reports progress
    const newLeadHelper = remaining.find(
        (h) => String(h.claimed.yourId) === String(newLead.volunteerId)
    );
    newLeadHelper.socket.emit("alert:status", { alertId, status: "on_the_way" });
    await wait(500);
    newLeadHelper.socket.emit("alert:status", { alertId, status: "arrived" });
    await wait(600);
    const entry = list.find((r) => String(r.volunteerId) === String(newLead.volunteerId));
    console.log(
        entry && entry.status === "arrived"
            ? "TEST 7 PASSED: the helper's progress (on the way, arrived) reached the woman"
            : "TEST 7 FAILED: " + JSON.stringify(entry)
    );

    // The woman ends the alert
    woman.emit("alert:status", { alertId, status: "resolved" });
    await wait(600);
    console.log(
        finalStatus === "resolved"
            ? "TEST 8 PASSED: the alert was resolved and everyone was told"
            : `TEST 8 FAILED: final status = ${finalStatus}`
    );

    woman.disconnect();
    far.disconnect();
    helpers.forEach((h) => h.socket.disconnect());
    process.exit(0);
}

main().catch((err) => {
    console.error("Test crashed:", err.message);
    process.exit(1);
});