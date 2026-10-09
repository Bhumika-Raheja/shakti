const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");

// Development only: every login uses this fixed code.
// In production, a real SMS service (like Twilio) would send a random OTP.
const TEST_OTP = "123456";

// A valid Indian mobile number: 10 digits starting with 6, 7, 8 or 9
const phoneSchema = z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

const sendOtpSchema = z.object({ phone: phoneSchema });

const verifyOtpSchema = z.object({
    phone: phoneSchema,
    otp: z.string().length(6, "OTP must be 6 digits"),
    // New accounts can only be a normal user or a volunteer, never an admin
    role: z.enum(["user", "volunteer"]).optional(),
});

// Step 1 of login: the user types their phone number
exports.sendOtp = (req, res) => {
    const result = sendOtpSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }
    // We do not send a real SMS here (development mode)
    res.json({ message: "OTP sent. For development, use 123456." });
};

// Step 2 of login: the user types the OTP, and we give them a token
exports.verifyOtp = async (req, res) => {
    const result = verifyOtpSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { phone, otp, role } = result.data;

    if (otp !== TEST_OTP) {
        return res.status(400).json({ message: "Wrong OTP" });
    }

    // Find the user, or create a new account if this phone is new
    let user = await User.findOne({ phone });
    if (!user) {
        user = await User.create({ phone, role: role || "user" });
    }

    // The token is valid for 7 days
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({ token, user });
};

// Returns the logged-in user (the auth middleware has already loaded it)
exports.me = (req, res) => {
    res.json({ user: req.user });
};


// PATCH /api/auth/me  { name }: saves the user's name
const nameSchema = z.object({
    name: z.string().trim().min(1, "Enter your name").max(50),
});

exports.updateMe = async (req, res) => {
    const parsed = nameSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    req.user.name = parsed.data.name;
    await req.user.save();
    res.json({ user: req.user });
};