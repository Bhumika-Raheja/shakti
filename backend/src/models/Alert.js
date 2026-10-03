const mongoose = require("mongoose");

// One helper who accepted an alert, with their own progress.
// The first helper in the list is the "lead" (the first to accept).
const responderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // "left" means this helper dropped out
        status: {
            type: String,
            enum: ["accepted", "on_the_way", "arrived", "left"],
            default: "accepted",
        },
        joinedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

// One SOS alert, from the moment it is triggered until it is resolved
const alertSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true }, // [longitude, latitude]
        },
        // active = waiting for helpers, accepted = at least one helper is coming
        status: {
            type: String,
            enum: ["active", "accepted", "resolved", "cancelled"],
            default: "active",
        },
        // Up to 3 helpers (the limit is enforced in the socket code)
        responders: { type: [responderSchema], default: [] },
        notifiedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

alertSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Alert", alertSchema);