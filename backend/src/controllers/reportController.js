const { z } = require("zod");
const Report = require("../models/Report");
const { distanceInMeters } = require("../services/matching");

const MAX_PER_DAY = 5;
const WINDOW_DAYS = 30;
const MAX_RADIUS_METERS = 5000;

const createSchema = z.object({
  type: z.enum(["poor_lighting", "followed", "harassment"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// The query string arrives as text, so we turn it into numbers
const nearSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(50).max(MAX_RADIUS_METERS).default(500),
});

// POST /api/reports  { type, lat, lng }
exports.create = async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Choose a type and a valid location" });
  }
  const { type, lat, lng } = parsed.data;

  // Spam limit: 5 reports per user in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const today = await Report.countDocuments({ user: req.user._id, createdAt: { $gte: since } });
  if (today >= MAX_PER_DAY) {
    return res
      .status(429)
      .json({ message: `You can send up to ${MAX_PER_DAY} reports per day` });
  }

  const report = await Report.create({
    user: req.user._id,
    type,
    location: { type: "Point", coordinates: [lng, lat] },
  });
  res.status(201).json({ id: report._id, type: report.type, createdAt: report.createdAt });
};

// GET /api/reports/near?lat=..&lng=..&radius=500
// Gives the map its data. Reports are anonymous: no user information is returned.
exports.near = async (req, res) => {
  const parsed = nearSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "lat and lng are required" });
  }
  const { lat, lng, radius } = parsed.data;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const reports = await Report.find({
    createdAt: { $gte: since },
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  })
    .limit(100)
    .select("type location createdAt"); // never the user field

  const items = reports.map((r) => {
    const [rLng, rLat] = r.location.coordinates;
    return {
      id: r._id,
      type: r.type,
      lat: rLat,
      lng: rLng,
      createdAt: r.createdAt,
      distanceMeters: Math.round(distanceInMeters(lat, lng, rLat, rLng)),
    };
  });

  res.json({ count: items.length, radiusMeters: radius, windowDays: WINDOW_DAYS, reports: items });
};