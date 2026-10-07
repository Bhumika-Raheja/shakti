// Load secret settings from the .env file
require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const app = express();

// Security and basic helpers
app.use(helmet());            // adds safe HTTP headers
app.use(cors());              // lets the mobile app talk to this server
app.use(express.json());      // lets the server read JSON sent by the app

// A simple route to check the server is alive
app.get("/api/health", (req, res) => {
    res.json({ ok: true, app: "Shakti backend" });
});

// Login routes
app.use("/api/auth", require("./routes/auth"));

// Trusted contacts routes
app.use("/api/contacts", require("./routes/contacts"));

// Volunteer registration and the online switch
app.use("/api/volunteers", require("./routes/volunteers"));

// Unsafe-area reports for the safety map
app.use("/api/reports", require("./routes/reports"));

// Admin tools (approve or suspend volunteers)
app.use("/api/admin", require("./routes/admin"));

// Friendly messages for upload mistakes and other unexpected errors.
// This must come AFTER all the routes.
app.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File is too large (max 5 MB)" });
    }
    if (err.name === "MulterError" || err.message === "Only JPG, PNG or PDF files are allowed") {
        return res.status(400).json({ message: err.message });
    }
    // A photo upload that was cut off half-way (for example, a weak connection)
    if (err.message === "Unexpected end of form") {
        return res
            .status(400)
            .json({ message: "The upload was interrupted. Please try again." });
    }
    console.error(err);
    res.status(500).json({
        message:
            process.env.NODE_ENV === "production"
                ? "Something went wrong"
                : `Something went wrong: ${err.message}`,
    });
});

// Socket.io needs a plain HTTP server underneath Express
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
require("./sockets")(io);

// Connect to the database first, then start the server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Shakti server running on port ${PORT}`);
    });
});