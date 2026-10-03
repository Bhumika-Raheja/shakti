const mongoose = require("mongoose");

// One SOS alert, from the moment it is triggered until it is resolved
const alertSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true }, // [longitude, latitude]
        },
        status: {
            type: String,
            enum: ["active", "accepted", "on_the_way", "arrived", "resolved", "cancelled"],
            default: "active",
        },
        acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        notifiedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

alertSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Alert", alertSchema);