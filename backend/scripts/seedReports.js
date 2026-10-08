// Fills the safety map with sample reports around the test location.
//   node scripts/seedReports.js          -> add the sample reports
//   node scripts/seedReports.js clear    -> remove them, and the test user's own reports
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Report = require("../src/models/Report");

const SEED_PHONE = "9000000090"; // a made-up user who "sent" the sample reports
const TEST_USER_PHONE = "9876543210"; // the user you log in with on the phone

// [type, latitude, longitude, hours ago]
// The test location is Indiranagar, Bangalore (12.9784, 77.6408)
const samples = [
    // Four reports in one spot, about 80 m away -> a deep red circle
    ["poor_lighting", 12.979, 77.6412, 5],
    ["followed", 12.97905, 77.64125, 30],
    ["harassment", 12.97895, 77.64115, 52],
    ["poor_lighting", 12.9791, 77.6411, 100],
    // Two reports in another spot, about 170 m away -> a rose circle
    ["harassment", 12.9772, 77.6395, 10],
    ["poor_lighting", 12.97725, 77.63955, 70],
    // One report, about 280 m away -> a light pink circle
    ["followed", 12.98, 77.643, 200],
    // One report far away (about 9 km): the map should NOT show it
    ["poor_lighting", 13.05, 77.7, 20],
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    await Report.init(); // makes sure the location index exists

    const seedUser = await User.findOneAndUpdate(
        { phone: SEED_PHONE },
        { name: "Sample reporter", role: "user" },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    const testUser = await User.findOne({ phone: TEST_USER_PHONE });

    await Report.deleteMany({ user: seedUser._id });
    if (process.argv[2] === "clear") {
        if (testUser) await Report.deleteMany({ user: testUser._id });
        console.log("Sample reports (and the test user's reports) removed.");
    } else {
        await Report.insertMany(
            samples.map(([type, lat, lng, hoursAgo]) => ({
                user: seedUser._id,
                type,
                location: { type: "Point", coordinates: [lng, lat] },
                createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
            }))
        );
        console.log(`${samples.length} sample reports added (7 near the test location, 1 far away).`);
    }
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});