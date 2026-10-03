const { z } = require("zod");
const Alert = require("../models/Alert");
const { findNearbyVolunteers, distanceInMeters } = require("../services/matching");

const triggerSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

const FIRST_RADIUS_METERS = 1000; // search within 1 km first

// Handles the events that belong to an SOS alert
module.exports = function alertSocket(io, socket) {
    // The woman presses and holds the SOS button
    socket.on("sos:trigger", async (payload) => {
        try {
            if (socket.user.role !== "user") {
                return socket.emit("sos:error", { message: "Only users can send an SOS" });
            }

            const parsed = triggerSchema.safeParse(payload);
            if (!parsed.success) {
                return socket.emit("sos:error", { message: "Invalid location" });
            }
            const { lat, lng } = parsed.data;

            // A new SOS replaces any older one that is still waiting
            await Alert.updateMany(
                { user: socket.user._id, status: "active" },
                { status: "cancelled" }
            );

            const alert = await Alert.create({
                user: socket.user._id,
                location: { type: "Point", coordinates: [lng, lat] },
            });

            // The woman joins this alert's private room, to get updates later
            socket.join(`alert:${alert._id}`);

            // Find volunteers within 1 km and remember who was told
            const volunteers = await findNearbyVolunteers(
                lng,
                lat,
                FIRST_RADIUS_METERS,
                socket.user._id
            );
            alert.notifiedVolunteers = volunteers.map((v) => v.user);
            await alert.save();

            // Tell each nearby volunteer. Privacy: no name or photo, and the
            // location is rounded (about 100 m) until the volunteer accepts.
            for (const v of volunteers) {
                const [vLng, vLat] = v.location.coordinates;
                const distance = Math.round(distanceInMeters(lat, lng, vLat, vLng));
                io.to(`user:${v.user}`).emit("alert:new", {
                    alertId: alert._id,
                    label: `Woman, ${distance} m away`,
                    distanceMeters: distance,
                    approxLocation: {
                        lat: Number(lat.toFixed(3)),
                        lng: Number(lng.toFixed(3)),
                    },
                    createdAt: alert.createdAt,
                });
            }

            // Confirm to the woman that her SOS went out
            socket.emit("sos:created", {
                alertId: alert._id,
                notifiedCount: volunteers.length,
            });
        } catch (err) {
            console.error("sos:trigger failed:", err.message);
            socket.emit("sos:error", { message: "Could not send SOS" });
        }
    });
};