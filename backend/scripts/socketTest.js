// A small helper to test our real-time connection from the terminal.
// Run it with:  node scripts/socketTest.js
const { io } = require("socket.io-client");

const BASE = "http://localhost:5000";

async function main() {
    // Log in to get a token (test OTP, development only)
    const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9876543210", otp: "123456", role: "user" }),
    });
    const { token } = await res.json();

    // Test 1: connect WITH a valid token
    const good = io(BASE, { auth: { token } });
    good.on("connected:ok", (data) => {
        console.log("TEST 1 PASSED: connected as", data.role);
        good.disconnect();

        // Test 2: connect with a FAKE token (should be refused)
        const bad = io(BASE, { auth: { token: "fake-token" } });
        bad.on("connect_error", (err) => {
            console.log("TEST 2 PASSED: fake token refused:", err.message);
            bad.disconnect();
            process.exit(0);
        });
    });
    good.on("connect_error", (err) => {
        console.log("TEST 1 FAILED:", err.message);
        process.exit(1);
    });
}

main();