// Load secret settings from the .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// Security and basic helpers
app.use(helmet());            // adds safe HTTP headers
app.use(cors());              // lets the mobile app talk to this server
app.use(express.json());      // lets the server read JSON sent by the app

// A simple route to check the server is alive
app.get("/api/health", (req, res) => {
    res.json({ ok: true, app: "Shakti backend" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Shakti server running on port ${PORT}`);
});