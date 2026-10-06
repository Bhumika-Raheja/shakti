const mongoose = require("mongoose");

// A report of an unsafe place, shown on the safety map
const reportSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: ["poor_lighting", "followed", "harassment"],
            required: true,
        },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true }, // [longitude, latitude]
        },
    },
    { timestamps: true }
);

reportSchema.index({ location: "2dsphere" });

// MongoDB deletes each report 30 days after it was created
reportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("Report", reportSchema);