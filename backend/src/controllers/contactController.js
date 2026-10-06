const { z } = require("zod");
const Contact = require("../models/Contact");

const MAX_CONTACTS = 5;

// Rules for the data the app sends us
const contactSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(50),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    relation: z.enum(["Family", "Friend", "Other"]).optional(),
});

// GET /api/contacts: list my contacts (primary first)
exports.list = async (req, res) => {
    const contacts = await Contact.find({ owner: req.user._id }).sort({
        isPrimary: -1,
        createdAt: 1,
    });
    res.json({ contacts });
};

// POST /api/contacts: add a contact (max 5)
exports.add = async (req, res) => {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const count = await Contact.countDocuments({ owner: req.user._id });
    if (count >= MAX_CONTACTS) {
        return res
            .status(400)
            .json({ message: `You can add up to ${MAX_CONTACTS} contacts` });
    }

    // The first contact becomes the primary one automatically
    const contact = await Contact.create({
        ...result.data,
        owner: req.user._id,
        isPrimary: count === 0,
    });
    res.status(201).json({ contact });
};

// PUT /api/contacts/:id: edit a contact
exports.update = async (req, res) => {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    // "owner: req.user._id" makes sure people can only edit their own contacts
    const contact = await Contact.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id },
        result.data,
        { new: true }
    );
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ contact });
};

// PATCH /api/contacts/:id/primary: make this the primary contact
exports.setPrimary = async (req, res) => {
    const contact = await Contact.findOne({
        _id: req.params.id,
        owner: req.user._id,
    });
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    // First mark this one, THEN clear all the others. This way there is never
    // a moment with no primary contact.
    await Contact.updateOne(
        { _id: contact._id, owner: req.user._id },
        { isPrimary: true }
    );
    await Contact.updateMany(
        { owner: req.user._id, _id: { $ne: contact._id } },
        { isPrimary: false }
    );

    const updated = await Contact.findById(contact._id);
    res.json({ contact: updated });
};

// DELETE /api/contacts/:id: remove a contact
exports.remove = async (req, res) => {
    const contact = await Contact.findOneAndDelete({
        _id: req.params.id,
        owner: req.user._id,
    });
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    // If we removed the primary one, make the oldest remaining one primary
    if (contact.isPrimary) {
        const next = await Contact.findOne({ owner: req.user._id }).sort({ createdAt: 1 });
        if (next) {
            next.isPrimary = true;
            await next.save();
        }
    }
    res.json({ message: "Contact removed" });
};