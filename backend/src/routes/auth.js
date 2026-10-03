const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const { sendOtp, verifyOtp, me } = require("../controllers/authController");

const router = express.Router();

// Stops anyone from trying too many OTPs quickly
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    message: { message: "Too many attempts. Please try again later." },
});

router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.get("/me", auth, me);

module.exports = router;