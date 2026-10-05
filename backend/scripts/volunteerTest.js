// Tests volunteer registration, admin approval and the online switch.
// Run with:  node scripts/volunteerTest.js
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("../src/models/User");
const Volunteer = require("../src/models/Volunteer");
const { UPLOAD_DIR } = require("../src/middleware/upload");

const BASE = "http://localhost:5000";
const PHONE = "9111111111"; // the brand-new test volunteer
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

// Remove the test volunteer (and their ID file) so the test can be repeated
async function cleanup() {
    const user = await User.findOne({ phone: PHONE });
    if (!user) return;
    const vol = await Volunteer.findOne({ user: user._id });
    if (vol && vol.idDocPath) {
        fs.rmSync(path.join(UPLOAD_DIR, path.basename(vol.idDocPath)), { force: true });
    }
    await Volunteer.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
}

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
    let payload;
    if (body instanceof FormData) {
        payload = body;
    } else if (body) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }
    const res = await fetch(BASE + url, { method, headers, body: payload });
    const type = res.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await res.json() : null;
    return { status: res.status, data, type };
}

function form(file) {
    const f = new FormData();
    f.append("name", "Test Volunteer");
    f.append("area", "Koramangala");
    if (file === "png") f.append("idDoc", new Blob([PNG], { type: "image/png" }), "id.png");
    if (file === "txt") f.append("idDoc", new Blob(["hello"], { type: "text/plain" }), "id.txt");
    return f;
}

let failed = 0;
function check(label, ok, extra) {
    if (!ok) failed++;
    console.log(`${ok ? "PASSED" : "FAILED"}: ${label}${!ok && extra ? "  -> " + extra : ""}`);
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    await cleanup();

    const vol = await login(PHONE, "volunteer");
    const woman = await login("9876543210", "user");
    const admin = await login("9000000099", "user");

    let r = await call("POST", "/api/volunteers/register", vol, form("none"));
    check("1. registering without an ID file is refused", r.status === 400, r.status);

    r = await call("POST", "/api/volunteers/register", vol, form("txt"));
    check("2. a .txt file is refused (only JPG, PNG or PDF)", r.status === 400, r.status);

    r = await call("POST", "/api/volunteers/register", vol, form("png"));
    const text = JSON.stringify(r.data);
    check(
        "3. a valid registration is accepted and starts as pending, with no file name exposed",
        r.status === 201 && r.data.volunteer.status === "pending" && !text.includes("idDocPath"),
        r.status + " " + text
    );

    r = await call("POST", "/api/volunteers/register", vol, form("png"));
    check("4. registering twice is refused", r.status === 400, r.status);

    r = await call("POST", "/api/volunteers/register", woman, form("png"));
    check("5. a normal user cannot register as a volunteer", r.status === 403, r.status);

    r = await call("PATCH", "/api/volunteers/online", vol, { isOnline: true, lat: 12.97, lng: 77.64 });
    check("6. a pending volunteer cannot go online", r.status === 403, r.status);

    r = await call("GET", "/api/admin/volunteers?status=pending", admin);
    const mine = r.data && r.data.volunteers.find((v) => v.phone === PHONE);
    check("7. the admin sees the new volunteer in the pending list", r.status === 200 && Boolean(mine), r.status);
    const id = mine && mine.id;

    r = await call("GET", "/api/admin/volunteers?status=pending", vol);
    const r2 = await call("GET", `/api/admin/volunteers/${id}/id-doc`, vol);
    check("8. a volunteer cannot use admin routes or view an ID", r.status === 403 && r2.status === 403, `${r.status}, ${r2.status}`);

    r = await call("GET", `/api/admin/volunteers/${id}/id-doc`, admin);
    check("9. the admin can view the uploaded ID image", r.status === 200 && r.type.startsWith("image/png"), `${r.status} ${r.type}`);

    r = await call("PATCH", `/api/admin/volunteers/${id}`, admin, { status: "verified" });
    check("10. the admin approves the volunteer", r.status === 200 && r.data.status === "verified", r.status);

    r = await call("PATCH", "/api/volunteers/online", vol, { isOnline: true });
    check("11. going online without a location is refused", r.status === 400, r.status);

    r = await call("PATCH", "/api/volunteers/online", vol, { isOnline: true, lat: 12.97, lng: 77.64 });
    check("12. a verified volunteer can go online with a location", r.status === 200 && r.data.volunteer.isOnline === true, r.status);

    r = await call("GET", "/api/volunteers/me", vol);
    check("13. the profile shows verified and online", r.status === 200 && r.data.volunteer.status === "verified" && r.data.volunteer.isOnline === true, JSON.stringify(r.data));

    await call("PATCH", `/api/admin/volunteers/${id}`, admin, { status: "suspended" });
    r = await call("GET", "/api/volunteers/me", vol);
    const r3 = await call("PATCH", "/api/volunteers/online", vol, { isOnline: true, lat: 12.97, lng: 77.64 });
    check(
        "14. a suspended volunteer is forced offline and cannot go online again",
        r.data.volunteer.status === "suspended" && r.data.volunteer.isOnline === false && r3.status === 403,
        JSON.stringify(r.data)
    );

    await cleanup();
    await mongoose.disconnect();
    console.log(failed === 0 ? "\nALL 14 TESTS PASSED" : `\n${failed} TEST(S) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error("Test crashed:", err.message);
    process.exit(1);
});