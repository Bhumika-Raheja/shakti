// Lists volunteers waiting for approval, and approves (or pauses) one.
//
//   node scripts/approveVolunteer.js                       -> list waiting volunteers
//   node scripts/approveVolunteer.js 9333333333            -> approve this phone number
//   node scripts/approveVolunteer.js 9333333333 suspended  -> pause this volunteer
//   node scripts/approveVolunteer.js 9333333333 pending    -> put back to waiting
//
// A real product would have an admin web page for this.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Volunteer = require("../src/models/Volunteer");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const [phone, status = "verified"] = process.argv.slice(2);

    if (!phone) {
        const waiting = await Volunteer.find({ status: "pending" }).populate("user", "name phone");
        if (waiting.length === 0) console.log("Nobody is waiting for approval.");
        waiting.forEach((v) =>
            console.log(
                `${v.user.phone}  ${v.user.name || "(no name)"}  area: ${v.area}  ID uploaded: ${v.idDocPath ? "yes" : "no"}`
            )
        );
    } else {
        if (!["verified", "suspended", "pending"].includes(status)) {
            console.log("Status must be: verified, suspended or pending");
        } else {
            const user = await User.findOne({ phone });
            const vol = user && (await Volunteer.findOne({ user: user._id }));
            if (!vol) {
                console.log(`No volunteer registration found for ${phone}`);
            } else {
                vol.status = status;
                if (status !== "verified") vol.isOnline = false; // not verified: no alerts
                await vol.save();
                console.log(`${phone} (${user.name || "no name"}) is now: ${status}`);
            }
        }
    }
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});