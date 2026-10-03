const { z } = require("zod");
const Alert = require("../models/Alert");
const User = require("../models/User");
const Volunteer = require("../models/Volunteer");
const { findNearbyVolunteers, distanceInMeters } = require("../services/matching");

const FIRST_RADIUS_METERS = 1000; // search within 1 km first
const MAX_RESPONDERS = 3; // how many helpers can join one alert
const OPEN_STATUSES = ["active", "accepted"];

// An alert id is a 24-character MongoDB id
const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid alert id");
const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

const triggerSchema = z.object({ lat: latSchema, lng: lngSchema });
const alertIdSchema = z.object({ alertId: idSchema });
const locationSchema = z.object({ alertId: idSchema, lat: latSchema, lng: lngSchema });
const statusSchema = z.object({
    alertId: idSchema,
    status: z.enum(["on_the_way", "arrived", "resolved"]),
});

// A helper's own progress can only move forward in this order
const ALLOWED_FROM = {
    on_the_way: ["accepted"],
    arrived: ["on_the_way"],
};

// Helpers who have not left
function activeResponders(alert) {
    return alert.responders.filter((r) => r.status !== "left");
}

// Builds the list the app shows: name, rating, progress, and who is the lead.
// The lead is the first helper in the list who has not left.
async function buildResponderList(alert) {
    const ids = alert.responders.map((r) => r.user);
    const users = await User.find({ _id: { $in: ids } }).select("name");
    const vols = await Volunteer.find({ user: { $in: ids } }).select(
        "user rating helpedCount"
    );
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const volMap = new Map(vols.map((v) => [String(v.user), v]));

    let leadFound = false;
    return alert.responders.map((r) => {
        const isActive = r.status !== "left";
        const isLead = isActive && !leadFound;
        if (isLead) leadFound = true;
        const u = userMap.get(String(r.user));
        const v = volMap.get(String(r.user));
        return {
            volunteerId: r.user,
            name: u && u.name ? u.name : "Volunteer",
            rating: v ? v.rating : 0,
            helpedCount: v ? v.helpedCount : 0,
            status: r.status,
            isLead,
        };
    });
}

// Sends the current helper list to everyone in the alert's room
async function sendResponderList(io, alert) {
    const responders = await buildResponderList(alert);
    io.to(`alert:${alert._id}`).emit("alert:responders", {
        alertId: alert._id,
        responders,
        slotsLeft: MAX_RESPONDERS - activeResponders(alert).length,
    });
}

// Tells the notified volunteers who are NOT helping (and never joined)
function notifyOthers(io, alert, event, extra) {
    const joined = new Set(alert.responders.map((r) => String(r.user)));
    alert.notifiedVolunteers
        .filter((id) => !joined.has(String(id)))
        .forEach((id) => {
            io.to(`user:${id}`).emit(event, { alertId: alert._id, ...extra });
        });
}

module.exports = function alertSocket(io, socket) {
    const me = socket.user._id;

    // A filter that matches "I am an active helper on this alert"
    const iAmActiveHelper = {
        responders: { $elemMatch: { user: me, status: { $ne: "left" } } },
    };

    // ---------------------------------------------------------------
    // 1. The woman presses and holds the SOS button
    // ---------------------------------------------------------------
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
            await Alert.updateMany({ user: me, status: "active" }, { status: "cancelled" });

            const alert = await Alert.create({
                user: me,
                location: { type: "Point", coordinates: [lng, lat] },
            });
            socket.join(`alert:${alert._id}`);

            const volunteers = await findNearbyVolunteers(lng, lat, FIRST_RADIUS_METERS, me);
            alert.notifiedVolunteers = volunteers.map((v) => v.user);
            await alert.save();

            // Privacy: volunteers see no name or photo, and only a rounded
            // location, until they accept.
            for (const v of volunteers) {
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

            socket.emit("sos:created", {
                alertId: alert._id,
                notifiedCount: volunteers.length,
            });
        } catch (err) {
            console.error("sos:trigger failed:", err.message);
            socket.emit("sos:error", { message: "Could not send SOS" });
        }
    });

    // ---------------------------------------------------------------
    // 2. A volunteer taps "Accept and go" (up to 3 can join)
    // ---------------------------------------------------------------
    socket.on("alert:accept", async (payload) => {
        try {
            if (socket.user.role !== "volunteer") {
                return socket.emit("alert:error", { message: "Only volunteers can accept" });
            }
            const parsed = alertIdSchema.safeParse(payload);
            if (!parsed.success) {
                return socket.emit("alert:error", { message: "Invalid alert" });
            }
            const alertId = parsed.data.alertId;

            // Only verified volunteers may accept
            const volunteer = await Volunteer.findOne({ user: me, status: "verified" });
            if (!volunteer) {
                return socket.emit("alert:error", { message: "You are not verified yet" });
            }

            // THE IMPORTANT PART: one atomic update.
            // MongoDB adds this volunteer ONLY IF all of this is true at that moment:
            //   - the alert is still open
            //   - this volunteer was one of the people notified
            //   - this volunteer has not joined before
            //   - fewer than 3 helpers (who have not left) are on it
            // Because it is a single step, if 4 volunteers tap at once, exactly 3 win.
            const alert = await Alert.findOneAndUpdate(
                {
                    _id: alertId,
                    status: { $in: OPEN_STATUSES },
                    notifiedVolunteers: me,
                    "responders.user": { $ne: me },
                    $expr: {
                        $lt: [
                            {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ["$responders", []] },
                                        cond: { $ne: ["$$this.status", "left"] },
                                    },
                                },
                            },
                            MAX_RESPONDERS,
                        ],
                    },
                },
                {
                    $set: { status: "accepted" },
                    $push: {
                        responders: { user: me, status: "accepted", joinedAt: new Date() },
                    },
                },
                { returnDocument: "after" }
            );

            if (!alert) {
                // Work out a helpful reason (without leaking anything to people
                // who were never alerted)
                const existing = await Alert.findById(alertId).select(
                    "status notifiedVolunteers responders"
                );
                let message = "This alert is no longer available";
                if (existing && existing.notifiedVolunteers.some((id) => String(id) === String(me))) {
                    if (existing.responders.some((r) => String(r.user) === String(me))) {
                        message = "You already accepted this alert";
                    } else if (!OPEN_STATUSES.includes(existing.status)) {
                        message = "This alert is no longer active";
                    } else {
                        message = "Enough helpers are already on the way";
                    }
                }
                return socket.emit("alert:error", { message });
            }

            // This volunteer and the woman now share the alert's private room
            socket.join(`alert:${alert._id}`);
            io.in(`user:${alert.user}`).socketsJoin(`alert:${alert._id}`);

            const active = activeResponders(alert);
            const isLead = String(active[0].user) === String(me);
            const slotsLeft = MAX_RESPONDERS - active.length;

            const woman = await User.findById(alert.user).select("name");
            const [lng, lat] = alert.location.coordinates;

            // To this volunteer: NOW the real name and exact location
            socket.emit("alert:claimed", {
                alertId: alert._id,
                yourId: me,
                isLead,
                slotsLeft,
                user: { name: woman && woman.name ? woman.name : "Woman in need" },
                location: { lat, lng },
            });

            // To the woman and all helpers: the updated list of helpers
            await sendResponderList(io, alert);

            // To the volunteers who have not joined: how many spots are left
            notifyOthers(io, alert, "alert:slots", { slotsLeft });
        } catch (err) {
            console.error("alert:accept failed:", err.message);
            socket.emit("alert:error", { message: "Could not accept the alert" });
        }
    });

    // ---------------------------------------------------------------
    // 3. Live location from the woman or from an active helper
    // ---------------------------------------------------------------
    socket.on("location:update", async (payload) => {
        try {
            const parsed = locationSchema.safeParse(payload);
            if (!parsed.success) return;
            const { alertId, lat, lng } = parsed.data;

            // Only the woman or an active helper of this alert may send positions
            const alert = await Alert.findOne({
                _id: alertId,
                status: { $in: OPEN_STATUSES },
                $or: [{ user: me }, iAmActiveHelper],
            })
                .select("user")
                .lean();
            if (!alert) return;

            const from = String(alert.user) === String(me) ? "user" : "volunteer";

            // We only pass the position along. We never save it, so there is
            // no location trail to delete later (a privacy feature).
            socket.to(`alert:${alertId}`).emit("location:update", {
                alertId,
                from,
                volunteerId: from === "volunteer" ? me : null,
                lat,
                lng,
            });
        } catch (err) {
            console.error("location:update failed:", err.message);
        }
    });

    // ---------------------------------------------------------------
    // 4. Progress: a helper marks on_the_way / arrived; anyone on the
    //    alert can mark it resolved
    // ---------------------------------------------------------------
    socket.on("alert:status", async (payload) => {
        try {
            const parsed = statusSchema.safeParse(payload);
            if (!parsed.success) {
                return socket.emit("alert:error", { message: "Invalid status" });
            }
            const { alertId, status } = parsed.data;

            if (status === "resolved") {
                const alert = await Alert.findOneAndUpdate(
                    { _id: alertId, status: "accepted", $or: [{ user: me }, iAmActiveHelper] },
                    { status: "resolved", resolvedAt: new Date() },
                    { returnDocument: "after" }
                );
                if (!alert) {
                    return socket.emit("alert:error", { message: "That status change is not allowed" });
                }

                // Every helper who stayed gets +1 on their helped count
                const ids = activeResponders(alert).map((r) => r.user);
                if (ids.length) {
                    await Volunteer.updateMany({ user: { $in: ids } }, { $inc: { helpedCount: 1 } });
                }

                io.to(`alert:${alert._id}`).emit("alert:status", {
                    alertId: alert._id,
                    status: "resolved",
                });
                // Tell volunteers who were waiting for a spot that it is over
                notifyOthers(io, alert, "alert:closed", { status: "resolved" });
                return;
            }

            // on_the_way or arrived: changes only THIS helper's own progress
            const alert = await Alert.findOneAndUpdate(
                {
                    _id: alertId,
                    status: "accepted",
                    responders: { $elemMatch: { user: me, status: { $in: ALLOWED_FROM[status] } } },
                },
                { $set: { "responders.$.status": status } },
                { returnDocument: "after" }
            );
            if (!alert) {
                return socket.emit("alert:error", { message: "That status change is not allowed" });
            }
            await sendResponderList(io, alert);
        } catch (err) {
            console.error("alert:status failed:", err.message);
            socket.emit("alert:error", { message: "Could not update the status" });
        }
    });

    // ---------------------------------------------------------------
    // 5. A helper drops out
    // ---------------------------------------------------------------
    socket.on("alert:leave", async (payload) => {
        try {
            const parsed = alertIdSchema.safeParse(payload);
            if (!parsed.success) return;

            const alert = await Alert.findOneAndUpdate(
                { _id: parsed.data.alertId, status: "accepted", ...iAmActiveHelper },
                { $set: { "responders.$.status": "left" } },
                { returnDocument: "after" }
            );
            if (!alert) {
                return socket.emit("alert:error", { message: "You are not helping with this alert" });
            }

            // This volunteer stops receiving the alert's updates
            socket.leave(`alert:${alert._id}`);
            socket.emit("alert:left", { alertId: alert._id });

            // The woman and the remaining helpers see the new list (and new lead)
            await sendResponderList(io, alert);

            const stillHelping = activeResponders(alert).length;
            if (stillHelping === 0) {
                // Nobody is coming any more: reopen the alert for the others
                const reopened = await Alert.findOneAndUpdate(
                    { _id: alert._id, status: "accepted" },
                    { status: "active" },
                    { returnDocument: "after" }
                );
                io.to(`alert:${alert._id}`).emit("alert:status", {
                    alertId: alert._id,
                    status: "active",
                });
                notifyOthers(io, reopened || alert, "alert:reopened", {
                    slotsLeft: MAX_RESPONDERS,
                });
            } else {
                notifyOthers(io, alert, "alert:slots", {
                    slotsLeft: MAX_RESPONDERS - stillHelping,
                });
            }
        } catch (err) {
            console.error("alert:leave failed:", err.message);
        }
    });

    // ---------------------------------------------------------------
    // 6. The woman taps "I am safe, cancel alert"
    // ---------------------------------------------------------------
    socket.on("alert:cancel", async (payload) => {
        try {
            const parsed = alertIdSchema.safeParse(payload);
            if (!parsed.success) return;

            const alert = await Alert.findOneAndUpdate(
                { _id: parsed.data.alertId, user: me, status: { $in: OPEN_STATUSES } },
                { status: "cancelled", resolvedAt: new Date() },
                { returnDocument: "after" }
            );
            if (!alert) return;

            io.to(`alert:${alert._id}`).emit("alert:status", {
                alertId: alert._id,
                status: "cancelled",
            });
            // Tell every notified volunteer to stop showing the alert
            alert.notifiedVolunteers.forEach((id) => {
                io.to(`user:${id}`).emit("alert:cancelled", { alertId: alert._id });
            });
        } catch (err) {
            console.error("alert:cancel failed:", err.message);
        }
    });
};