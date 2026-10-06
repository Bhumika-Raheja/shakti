// Tests the unsafe-area reports API. Run with:  node scripts/reportTest.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Report = require("../src/models/Report");

const BASE = "http://localhost:5000";
const PHONE = "9222222222"; // a brand-new test user
const HERE = { lat: 12.9784, lng: 77.6408 }; // Indiranagar, Bangalore

async function login(phone, role) {
    const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: "123456", role }),
    });
    return (await res.json()).token;
}

async function call(method, url, token, body) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(BASE + url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
}

let failed = 0;
function check(label, ok, extra) {
    if (!ok) failed++;
    console.log(`${ok ? "PASSED" : "FAILED"}: ${label}${!ok && extra ? "  -> " + extra : ""}`);
}

async function cleanup() {
    const user = await User.findOne({ phone: PHONE });
    if (user) {
        await Report.deleteMany({ user: user._id });
        await User.deleteOne({ _id: user._id });
    }
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    await Report.init(); // makes sure the location index exists
    await cleanup();

    const token = await login(PHONE, "user");

    let r = await call("POST", "/api/reports", null, { type: "poor_lighting", ...HERE });
    check("1. sending a report without logging in is refused", r.status === 401, r.status);

    r = await call("POST", "/api/reports", token, { type: "stolen_bike", ...HERE });
    check("2. an unknown report type is refused", r.status === 400, r.status);

    r = await call("POST", "/api/reports", token, { type: "poor_lighting", lat: 999, lng: 77 });
    check("3. an impossible location is refused", r.status === 400, r.status);

    r = await call("POST", "/api/reports", token, { type: "poor_lighting", lat: 12.9784, lng: 77.6408 });
    check("4. a valid report is saved", r.status === 201, r.status + " " + JSON.stringify(r.data));

    r = await call("POST", "/api/reports", token, { type: "followed", lat: 12.9805, lng: 77.6408 }); // about 230 m away
    check("5. a second report is saved", r.status === 201, r.status);

    r = await call("POST", "/api/reports", token, { type: "harassment", lat: 13.1, lng: 77.6408 }); // about 13 km away
    check("6. a far-away report is saved", r.status === 201, r.status);

    r = await call("GET", `/api/reports/near?lat=${HERE.lat}&lng=${HERE.lng}&radius=500`, token);
    const types = r.data.reports ? r.data.reports.map((x) => x.type).sort().join(",") : "";
    check(
        "7. a search within 500 m finds the 2 close reports and not the far one",
        r.status === 200 && r.data.count === 2 && types === "followed,poor_lighting",
        r.status + " " + JSON.stringify(r.data)
    );

    const text = JSON.stringify(r.data);
    check(
        "8. reports are anonymous: no user information is returned",
        !text.includes('"user"') && !text.includes("phone"),
        text
    );

    const sorted = r.data.reports.every(
        (x, i, a) => i === 0 || a[i - 1].distanceMeters <= x.distanceMeters
    );
    check("9. the closest report comes first, with its distance", sorted && r.data.reports[0].distanceMeters < 50, text);

    r = await call("GET", `/api/reports/near?lat=${HERE.lat}&lng=${HERE.lng}&radius=50000`, token);
    check("10. a huge search radius is refused", r.status === 400, r.status);

    r = await call("GET", "/api/reports/near", token);
    check("11. a search without a location is refused", r.status === 400, r.status);

    r = await call("POST", "/api/reports", token, { type: "poor_lighting", ...HERE });
    r = await call("POST", "/api/reports", token, { type: "poor_lighting", ...HERE });
    r = await call("POST", "/api/reports", token, { type: "poor_lighting", ...HERE }); // the 6th report today
    check("12. the 6th report in one day is refused (spam limit)", r.status === 429, r.status);

    await cleanup();
    await mongoose.disconnect();
    console.log(failed === 0 ? "\nALL 12 TESTS PASSED" : `\n${failed} TEST(S) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error("Test crashed:", err.message);
    process.exit(1);
});