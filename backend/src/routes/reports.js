// routes/reports.js
import express from "express";
import Trip from "../models/trip.model.js";
import Workshop from "../models/workshop.model.js";
import Bazaar from "../models/bazaar.model.js";
import BoothBooking from "../models/BoothBooking.js";
import Booth from "../models/booth.model.js";

const router = express.Router();

/**
 * Helper: escape regex for search string
 */
function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Attendees summary route (keeps previous behavior)
 * GET /reports/attendees/summary
 * Query params: type, q, startDate, endDate
 */
router.get("/attendees/summary", async (req, res) => {
  const { type = "all", q = "", startDate, endDate } = req.query;

  try {
    // Build name match / date match like previous implementation
    const nameMatch = q?.trim()
      ? { name: { $regex: escapeRegex(q.trim()), $options: "i" } }
      : {};

    const dateMatch = {};
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        range.$lte = d;
      }
      // prefer startDate else fallback to createdAt
      dateMatch.$or = [
        { startDate: range },
        { $and: [{ startDate: { $exists: false } }, { createdAt: range }] },
      ];
    }

    const baseMatch = Object.keys(dateMatch).length ? { ...nameMatch, ...dateMatch } : { ...nameMatch };

    const want = (t) => type === "all" || type === t;
    const tasks = [];

    if (want("workshop")) {
      tasks.push(
        Workshop.aggregate([
          { $match: baseMatch },
          {
            $project: {
              eventType: { $literal: "workshop" },
              eventId: "$_id",
              name: 1,
              date: { $ifNull: ["$startDate", "$createdAt"] },
              capacity: 1,
              attendedCount: { $size: { $ifNull: ["$registrants", []] } },
            },
          },
        ])
      );
    }

    if (want("trip")) {
      tasks.push(
        Trip.aggregate([
          { $match: baseMatch },
          {
            $project: {
              eventType: { $literal: "trip" },
              eventId: "$_1",
              name: 1,
              date: { $ifNull: ["$startDate", "$createdAt"] },
              capacity: 1,
              attendedCount: { $size: { $ifNull: ["$registrants", []] } },
            },
          },
        ])
      );
    }

    if (want("bazaar")) {
      tasks.push(
        Bazaar.aggregate([
          { $match: baseMatch },
          {
            $project: {
              eventType: { $literal: "bazaar" },
              eventId: "$_id",
              name: 1,
              date: { $ifNull: ["$startDate", "$createdAt"] },
              capacity: 1,
              attendedCount: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$vendorRequests", []] },
                        as: "vr",
                        cond: { $eq: ["$$vr.status", "accepted"] },
                      },
                    },
                    as: "acc",
                    in: { $size: { $ifNull: ["$$acc.attendees", []] } },
                  },
                },
              },
            },
          },
        ])
      );
    }

    const results = await Promise.all(tasks);
    const events = results.flat();

    res.json({
      totalEvents: events.length,
      totalAttendees: events.reduce((s, e) => s + (e.attendedCount || 0), 0),
      events,
    });
  } catch (err) {
    console.error("Attendees summary error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: "Failed to build attendees summary", error: err?.message || String(err) });
  }
});

/**
 * Safe revenue summary route
 * GET /reports/revenue/summary
 * Query params: type, q, startDate, endDate
 *
 * This implementation uses .find() + JS calculations to avoid fragile aggregation operators.
 */
function parseWeeksFromDuration(duration) {
  if (!duration) return 1;
  const match = ("" + duration).match(/(\d+)/);
  if (!match) return 1;
  const n = parseInt(match[1], 10);
  return isNaN(n) || n <= 0 ? 1 : n;
}

router.get("/revenue/summary", async (req, res) => {
  try {
    const { type = "all", q = "", startDate, endDate } = req.query;

    // Build simple JS query/filter objects
    const nameRegex = q && q.trim() ? new RegExp(escapeRegex(q.trim()), "i") : null;

    const dateRange = {};
    if (startDate) dateRange.$gte = new Date(startDate);
    if (endDate) {
      const d = new Date(endDate);
      d.setHours(23, 59, 59, 999);
      dateRange.$lte = d;
    }

    const want = (t) => type === "all" || type === t;
    const events = [];

    // TRIPS
    if (want("trip")) {
      const tripFilter = {};
      if (nameRegex) tripFilter.name = nameRegex;
      if (startDate || endDate) {
        tripFilter.$or = [{ startDate: dateRange }, { $and: [{ startDate: { $exists: false } }, { createdAt: dateRange }] }];
      }
      const trips = await Trip.find(tripFilter).lean();
      for (const trip of trips) {
        const registrantCount = Array.isArray(trip.registrants) ? trip.registrants.length : 0;
        const price = Number(trip.price) || 0;
        events.push({
          eventType: "trip",
          eventId: trip._id,
          name: trip.name,
          date: trip.startDate || trip.createdAt,
          capacity: trip.capacity ?? null,
          registrantCount,
          revenue: price * registrantCount,
          price,
        });
      }
    }

    // BOOTH BOOKINGS
    if (want("booth")) {
      const bbFilter = {};
      if (nameRegex) bbFilter.$or = [{ companyName: nameRegex }];
      if (startDate || endDate) {
        bbFilter.$or = bbFilter.$or || [];
        bbFilter.$or.push({ startDate: dateRange }, { $and: [{ startDate: { $exists: false } }, { createdAt: dateRange }] });
      }

      const bookings = await BoothBooking.find(bbFilter).lean();
      const boothIds = bookings.map((b) => b.booth).filter(Boolean);
      const boothsById = {};
      if (boothIds.length) {
        const booths = await Booth.find({ _id: { $in: boothIds } }).lean();
        for (const b of booths) boothsById[String(b._id)] = b;
      }

      for (const bk of bookings) {
        const boothDoc = boothsById[String(bk.booth)] || {};
        const weeks = parseWeeksFromDuration(bk.duration);
        const pricePerWeek = Number(boothDoc.pricePerWeek) || 0;
        const revenue = pricePerWeek * weeks;
        events.push({
          eventType: "booth",
          eventId: bk._id,
          name: bk.companyName || (boothDoc.name || "Booth"),
          date: bk.startDate || bk.createdAt,
          duration: bk.duration,
          weeks,
          pricePerWeek,
          revenue,
        });
      }
    }

    // BAZAARS
    if (want("bazaar")) {
      const bazFilter = {};
      if (nameRegex) bazFilter.name = nameRegex;
      if (startDate || endDate) {
        bazFilter.$or = [{ startDate: dateRange }, { $and: [{ startDate: { $exists: false } }, { createdAt: dateRange }] }];
      }
      const bazaars = await Bazaar.find(bazFilter).lean();
      for (const baz of bazaars) {
        const vendorRequests = Array.isArray(baz.vendorRequests) ? baz.vendorRequests : [];
        // Count accepted vendorRequests (change to check paidAt if you want only paid)
        const accepted = vendorRequests.filter((r) => r && String(r.status).toLowerCase() === "accepted");
        const count2x2 = accepted.filter((r) => String(r.boothSize).toLowerCase() === "2x2").length;
        const count4x4 = accepted.filter((r) => String(r.boothSize).toLowerCase() === "4x4").length;
        const price2x2 = Number(baz.price2x2) || 0;
        const price4x4 = Number(baz.price4x4) || 0;
        const boothsTaken = accepted.length;
        const revenue = count2x2 * price2x2 + count4x4 * price4x4;

        events.push({
          eventType: "bazaar",
          eventId: baz._id,
          name: baz.name,
          date: baz.startDate || baz.createdAt,
          price2x2,
          price4x4,
          boothsTaken,
          count2x2,
          count4x4,
          revenue,
        });
      }
    }

    // WORKSHOPS (if requested)
// WORKSHOPS (updated: revenue = number of registrants * priceToAttend)
if (want("workshop")) {
  const wf = {};
  if (nameRegex) wf.name = nameRegex;
  if (startDate || endDate) {
    wf.$or = [{ startDate: dateRange }, { $and: [{ startDate: { $exists: false } }, { createdAt: dateRange }] }];
  }

  const workshops = await Workshop.find(wf).lean();
  for (const w of workshops) {
    const registrantCount = Array.isArray(w.registrants) ? w.registrants.length : 0;
    const price = Number(w.priceToAttend) || 0;
    const revenue = registrantCount * price;

    events.push({
      eventType: "workshop",
      eventId: w._id,
      name: w.name,
      date: w.startDate || w.createdAt,
      capacity: w.capacity ?? null,
      registrantCount,
      priceToAttend: price,
      revenue,
    });
  }
}


    // Compute totals
    const revenueByType = {};
    for (const e of events) {
      const t = e.eventType || "unknown";
      revenueByType[t] = (revenueByType[t] || 0) + (Number(e.revenue) || 0);
    }
    const totalRevenue = Object.values(revenueByType).reduce((s, v) => s + v, 0);

    res.json({
      totalEvents: events.length,
      totalRevenue,
      revenueByType,
      events,
    });
  } catch (err) {
    console.error("Revenue summary route error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: "Failed to build revenue summary", error: err?.message || String(err) });
  }
});

export default router;
