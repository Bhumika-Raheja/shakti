const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Private folder for ID documents (never served publicly, never in git)
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "ids");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The only file types we accept
const ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // A random name, so nobody can guess a file name or learn the original one
    filename: (req, file, cb) =>
        cb(null, crypto.randomBytes(16).toString("hex") + ALLOWED[file.mimetype]),
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED[file.mimetype]) return cb(null, true);
        cb(new Error("Only JPG, PNG or PDF files are allowed"));
    },
});

module.exports = { uploadId: upload.single("idDoc"), UPLOAD_DIR };