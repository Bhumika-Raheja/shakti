const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/reportController");

const router = express.Router();

// Only logged-in users can send or view reports
router.use(auth);

router.post("/", c.create);
router.get("/near", c.near);

module.exports = router;