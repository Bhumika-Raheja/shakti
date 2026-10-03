const mongoose = require("mongoose");

// Extra details for a user who signs up as a volunteer
const volunteerSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        // pending = waiting for admin check, verified = can get alerts
        status: {
            type: String,
            enum: ["pending", "verified", "suspended"],
            default: "pending",
        },
        area: { type: String, trim: true, default: "" },
        idDocPath: { type: String, default: "" }, // private file path, never public
        isOnline: { type: Boolean, default: false },
        // Last known position, used to find volunteers near an alert
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
        },
        helpedCount: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// This index makes "find volunteers within 1 km" fast
volunteerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Volunteer", volunteerSchema);