const path = require("path");
const { z } = require("zod");
const Volunteer = require("../models/Volunteer");
const { UPLOAD_DIR } = require("../middleware/upload");

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const listSchema = z.enum(["pending", "verified", "suspended"]);
const statusSchema = z.object({ status: z.enum(["verified", "suspended"]) });

// GET /api/admin/volunteers?status=pending
exports.list = async (req, res) => {
    const parsed = listSchema.safeParse(req.query.status || "pending");
    if (!parsed.success) return res.status(400).json({ message: "Invalid status" });

    const volunteers = await Volunteer.find({ status: parsed.data })
        .populate("user", "name phone")
        .sort({ createdAt: 1 });

    res.json({
        volunteers: volunteers.map((v) => ({
            id: v._id,
            name: v.user ? v.user.name : "",
            phone: v.user ? v.user.phone : "",
            area: v.area,
            status: v.status,
            hasIdDoc: Boolean(v.idDocPath),
            createdAt: v.createdAt,
        })),
    });
};

// PATCH /api/admin/volunteers/:id  { status: "verified" | "suspended" }
exports.setStatus = async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) {
        return res.status(400).json({ message: "Invalid id" });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Status must be verified or suspended" });
    }

    const update = { status: parsed.data.status };
    // A volunteer who is not verified must stop receiving alerts at once
    if (update.status !== "verified") update.isOnline = false;

    const volunteer = await Volunteer.findByIdAndUpdate(req.params.id, update, {
        returnDocument: "after",
    });
    if (!volunteer) return res.status(404).json({ message: "Volunteer not found" });

    res.json({ id: volunteer._id, status: volunteer.status, isOnline: volunteer.isOnline });
};

// GET /api/admin/volunteers/:id/id-doc  (shows the uploaded ID to the admin)
exports.idDoc = async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) {
        return res.status(400).json({ message: "Invalid id" });
    }
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer || !volunteer.idDocPath) {
        return res.status(404).json({ message: "No ID document found" });
    }

    // path.basename stops anyone from escaping the private folder
    const file = path.join(UPLOAD_DIR, path.basename(volunteer.idDocPath));
    res.set("Cache-Control", "no-store");
    res.sendFile(file);
};