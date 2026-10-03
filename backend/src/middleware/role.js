// Only lets certain roles through, for example: requireRole("admin")
module.exports = function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "You are not allowed to do this" });
        }
        next();
    };
};