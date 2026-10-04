// Creates test volunteers in the database (development only).
// Run with:  node scripts/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Volunteer = require("../src/models/Volunteer");

// Coordinates are [longitude, latitude]
const volunteers = [
    { phone: "9000000001", name: "Ananya S.", area: "Indiranagar", coords: [77.643, 12.979] },  // near
    { phone: "9000000003", name: "Meera K.", area: "Indiranagar", coords: [77.6415, 12.979] },  // near
    { phone: "9000000004", name: "Kavya R.", area: "Indiranagar", coords: [77.642, 12.9785] },  // near
    { phone: "9000000005", name: "Divya M.", area: "Indiranagar", coords: [77.6395, 12.979] },  // near
    { phone: "9000000006", name: "Medium Volunteer", area: "Domlur", coords: [77.6408, 12.9964] }, // about 2 km
    { phone: "9000000002", name: "Far Volunteer", area: "Whitefield", coords: [77.7, 13.02] },  // far (about 6 km)
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    await Volunteer.init(); // makes sure the location index exists

    for (const v of volunteers) {
        const user = await User.findOneAndUpdate(
            { phone: v.phone },
            { name: v.name, role: "volunteer" },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
        await Volunteer.findOneAndUpdate(
            { user: user._id },
            {
                status: "verified",
                isOnline: true,
                area: v.area,
                location: { type: "Point", coordinates: v.coords },
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
        console.log(`Volunteer ready: ${v.name} (${v.phone})`);
    }

    await mongoose.disconnect();
    console.log("Seed done");
}

run().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});