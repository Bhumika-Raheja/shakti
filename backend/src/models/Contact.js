const mongoose = require("mongoose");

// A trusted contact who gets the SOS message (we limit this to 5 per user later)
const contactSchema = new mongoose.Schema(
    {
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        relation: {
            type: String,
            enum: ["Family", "Friend", "Other"],
            default: "Other",
        },
        isPrimary: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);