const fs = require("fs");
const path = require("path");
const { z } = require("zod");
const User = require("../models/User");
const Volunteer = require("../models/Volunteer");
const Alert = require("../models/Alert");
const { UPLOAD_DIR } = require("../middleware/upload");

const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(50),
    area: z.string().trim().min(1, "Area is required").max(60),
});

const onlineSchema = z
    .object({
        isOnline: z.boolean(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
    })
    .refine((d) => !d.isOnline || (d.lat !== undefined && d.lng !== undefined), {
        message: "Location is required to go online",
    });

// What the app is allowed to see. The ID file name is never included.
function publicVolunteer(v) {
    return {
        id: v._id,
        status: v.status,
        area: v.area,
        isOnline: v.isOnline,
        helpedCount: v.helpedCount,
        rating: v.rating,
        hasIdDoc: Boolean(v.idDocPath),
        createdAt: v.createdAt,
    };
}

// If we refuse a registration, delete the file that was just uploaded
function removeUpload(req) {
    if (req.file) fs.rmSync(path.join(UPLOAD_DIR, req.file.filename), { force: true });
}

// POST /api/volunteers/register  (form data: name, area, idDoc file)
exports.register = async (req, res) => {
    if (req.user.role !== "volunteer") {
        removeUpload(req);
        return res.status(403).json({ message: "Log in as a volunteer to register" });
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        removeUpload(req);
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    if (!req.file) {
        return res.status(400).json({ message: "Please upload a government ID" });
    }

    const existing = await Volunteer.findOne({ user: req.user._id });
    if (existing) {
        removeUpload(req);
        return res.status(400).json({ message: "You have already registered" });
    }

    const { name, area } = parsed.data;
    await User.updateOne({ _id: req.user._id }, { name });

    // New volunteers always start as "pending" until an admin checks the ID
    const volunteer = await Volunteer.create({
        user: req.user._id,
        area,
        idDocPath: req.file.filename, // only the file name; the folder is private
        status: "pending",
    });

    res.status(201).json({
        message: "Submitted. Our team will check your ID.",
        volunteer: publicVolunteer(volunteer),
    });
};

// GET /api/volunteers/me  (profile, stats and recent alerts)
exports.me = async (req, res) => {
    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer) {
        return res.status(404).json({ message: "You have not registered as a volunteer yet" });
    }

    const alerts = await Alert.find({ "responders.user": req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("status responders createdAt");

    const recentAlerts = alerts.map((a) => {
        const mine = a.responders.find((r) => String(r.user) === String(req.user._id));
        let outcome = "ongoing";
        if (mine && mine.status === "left") outcome = "left";
        else if (a.status === "resolved") outcome = "helped";
        else if (a.status === "cancelled") outcome = "cancelled";
        return { alertId: a._id, outcome, createdAt: a.createdAt };
    });

    res.json({ volunteer: publicVolunteer(volunteer), recentAlerts });
};

// PATCH /api/volunteers/online  { isOnline, lat, lng }
// Also used to refresh the volunteer's position while online.
exports.setOnline = async (req, res) => {
    const parsed = onlineSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { isOnline, lat, lng } = parsed.data;

    const volunteer = await Volunteer.findOne({ user: req.user._id, status: "verified" });
    if (!volunteer) {
        return res.status(403).json({ message: "Only verified volunteers can go online" });
    }

    volunteer.isOnline = isOnline;
    if (lat !== undefined && lng !== undefined) {
        volunteer.location = { type: "Point", coordinates: [lng, lat] };
    }
    await volunteer.save();

    res.json({ volunteer: publicVolunteer(volunteer) });
};