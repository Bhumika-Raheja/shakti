const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/contactController");

const router = express.Router();

// Every contact route needs a logged-in user
router.use(auth);

router.get("/", c.list);
router.post("/", c.add);
router.put("/:id", c.update);
router.patch("/:id/primary", c.setPrimary);
router.delete("/:id", c.remove);

module.exports = router;