const express = require("express");
const auth = require("../middleware/auth");
const { uploadId } = require("../middleware/upload");
const c = require("../controllers/volunteerController");

const router = express.Router();

// Log in first, THEN accept an upload
router.use(auth);

router.post("/register", uploadId, c.register);
router.get("/me", c.me);
router.patch("/online", c.setOnline);

module.exports = router;