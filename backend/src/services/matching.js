const Volunteer = require("../models/Volunteer");

// Finds verified, online volunteers within a radius (in meters) of a point.
// MongoDB's $near uses the 2dsphere index and returns the closest first.
async function findNearbyVolunteers(lng, lat, radiusMeters, excludeUserId) {
    return Volunteer.find({
        status: "verified",
        isOnline: true,
        user: { $ne: excludeUserId }, // never alert the person who sent the SOS
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: radiusMeters,
            },
        },
    });
}

// Straight-line distance between two points on Earth, in meters (haversine formula)
function distanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { findNearbyVolunteers, distanceInMeters };