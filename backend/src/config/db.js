const mongoose = require("mongoose");

// Connects our server to the MongoDB database in the cloud
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1); // stop the server if the database is not reachable
    }
}

module.exports = connectDB;