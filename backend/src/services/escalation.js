const Alert = require("../models/Alert");
const { findNearbyVolunteers, distanceInMeters } = require("./matching");

// How long to wait at each step. Default 60 seconds.
// (For testing we set ESCALATION_SECONDS=3 in the .env file.)
const STEP_MS = (Number(process.env.ESCALATION_SECONDS) || 60) * 1000;
const WIDER_RADIUS_METERS = 3000; // step 1: search again within 3 km

// Called right after an SOS is sent
function scheduleEscalation(io, alertId) {
    setTimeout(() => widenSearch(io, alertId), STEP_MS); // after 60 seconds
    setTimeout(() => giveUp(io, alertId), STEP_MS * 2); // after 120 seconds
}

// Step 1: nobody accepted, so alert volunteers within 3 km
async function widenSearch(io, alertId) {
    try {
        // Only continue if the alert is still waiting for helpers
        const alert = await Alert.findOne({ _id: alertId, status: "active" });
        if (!alert) return; // someone accepted, or she cancelled

        const [lng, lat] = alert.location.coordinates;
        const alreadyAlerted = new Set(alert.notifiedVolunteers.map(String));

        const found = await findNearbyVolunteers(lng, lat, WIDER_RADIUS_METERS, alert.user);
        const fresh = found.filter((v) => !alreadyAlerted.has(String(v.user)));

        if (fresh.length) {
            await Alert.updateOne(
                { _id: alert._id },
                { $addToSet: { notifiedVolunteers: { $each: fresh.map((v) => v.user) } } }
            );
        }

        // Same privacy rules as the first alert: only distance and a rounded location
        for (const v of fresh) {
            const [vLng, vLat] = v.location.coordinates;
            const distance = Math.round(distanceInMeters(lat, lng, vLat, vLng));
            io.to(`user:${v.user}`).emit("alert:new", {
                alertId: alert._id,
                label: `Woman, ${distance} m away`,
                distanceMeters: distance,
                approxLocation: { lat: Number(lat.toFixed(3)), lng: Number(lng.toFixed(3)) },
                createdAt: alert.createdAt,
            });
        }

        // Tell the woman that we searched wider
        io.to(`user:${alert.user}`).emit("alert:expanded", {
            alertId: alert._id,
            radiusMeters: WIDER_RADIUS_METERS,
            notifiedCount: fresh.length,
        });
    } catch (err) {
        console.error("widenSearch failed:", err.message);
    }
}

// Step 2: still nobody, so tell her to call 112
async function giveUp(io, alertId) {
    try {
        const alert = await Alert.findOne({ _id: alertId, status: "active" }).select("user");
        if (!alert) return;

        io.to(`user:${alert.user}`).emit("alert:unanswered", {
            alertId: alert._id,
            message: "No volunteer has accepted yet. Please call 112 now.",
        });
    } catch (err) {
        console.error("giveUp failed:", err.message);
    }
}

module.exports = { scheduleEscalation };