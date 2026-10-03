const mongoose = require("mongoose");

// A person using the app: a woman (user), a volunteer or an admin
const userSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: "" },
        phone: { type: String, required: true, unique: true, trim: true },
        role: {
            type: String,
            enum: ["user", "volunteer", "admin"],
            default: "user",
        },
    },
    { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);