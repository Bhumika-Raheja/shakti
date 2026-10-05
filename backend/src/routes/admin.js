const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");
const c = require("../controllers/adminController");

const router = express.Router();

// Everything here is for admins only
router.use(auth, requireRole("admin"));

router.get("/volunteers", c.list);
router.patch("/volunteers/:id", c.setStatus);
router.get("/volunteers/:id/id-doc", c.idDoc);

module.exports = router;