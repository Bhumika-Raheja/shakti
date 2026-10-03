const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Sets up everything real-time: who can connect, and what happens when they do
module.exports = function setupSockets(io) {
    // 1. Login check: every connection must bring a valid token,
    //    just like the normal routes.
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth && socket.handshake.auth.token;
            if (!token) return next(new Error("Please log in first"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) return next(new Error("User not found"));

            socket.user = user; // remember who this connection belongs to
            next();
        } catch (err) {
            next(new Error("Invalid or expired token"));
        }
    });

    // 2. When someone connects
    io.on("connection", (socket) => {
        // Every user joins a private room named after their id.
        // Later, we can send a message to one person with io.to("user:<id>").
        socket.join(`user:${socket.user._id}`);
        console.log(`Socket connected: ${socket.user.phone} (${socket.user.role})`);

        // Tell the app the connection worked
        socket.emit("connected:ok", {
            userId: socket.user._id,
            role: socket.user.role,
        });

        // Alert events (SOS, accept, and so on)
        require("./alertSocket")(io, socket);

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.user.phone}`);
        });
    });
};