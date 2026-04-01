import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import eventRoutes from "./routes/event.routes.js";
import gymRoutes from "./routes/gym.route.js";
import courtRoutes from "./routes/court.route.js";
import { authMiddleware } from "./middlewares/auth.js";
import cron from "node-cron";
import BoothBooking from "./models/BoothBooking.js";
import {
  processWaitingList,
  sendWorkshopCertificates,
} from "./controllers/event.controller.js";
import bazaarRoutes from "./routes/bazaar.route.js";
import paymentRoutes from "./routes/payment.route.js";
import walletRoutes from "./routes/wallet.route.js";
import { stripeWebhookHandler } from "./controllers/payment.controller.js";
import reportsRouter from "./routes/reports.js";
import loyaltyRoutes from "./routes/loyalty.route.js";
import rewardsRoutes from "./routes/rewards.route.js";
import pointsRoutes from "./routes/points.route.js";
import { startMidnightExpiryCron } from "./jobs/expiryNotifications.job.js";
import { startEventReminderCron } from "./jobs/eventReminders.job.js";
import supportRoutes from "./routes/support.route.js";
//import { processWaitingList } from "./controllers/event.controller.js";
//import bazaarRoutes from "./routes/bazaar.route.js";
import notificationRoutes from "./routes/notifications.route.js";
import chatRoutes from "./routes/chat.route.js";

// ------------------------------------
dotenv.config();

const app = express();

const PORT = process.env.PORT;

app.use(cors());
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);
app.use(express.json());

app.use("/api/reports", reportsRouter);
app.use("/api/events", authMiddleware, eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/gym", authMiddleware, gymRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/bazaars", bazaarRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", authMiddleware, walletRoutes);
app.use("/api/loyalty", authMiddleware, loyaltyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/rewards", rewardsRoutes);
app.use("/api", pointsRoutes);
app.use("/api/support", supportRoutes);
app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
  connectDB();
});

// Start background jobs AFTER DB is ready
startMidnightExpiryCron(); // deletes NotificationTemplate >= 7 days old, nightly @ 00:00
startEventReminderCron(); // sends 24H/1H reminders to registered students, every minute
console.log("✅ Notification jobs started");

cron.schedule("0 0 * * *", async () => {
  // runs every day at midnight
  try {
    const now = new Date();

    const expiredBookings = await BoothBooking.find({
      endDate: { $lt: now },
      expired: false,
    });

    if (expiredBookings.length > 0) {
      // Get booth IDs that will be freed up
      const boothIds = expiredBookings.map((booking) => booking.booth);

      // Delete expired booth bookings
      const deleteResult = await BoothBooking.deleteMany({
        endDate: { $lt: now },
        expired: false,
      });

      console.log(
        `Deleted ${deleteResult.deletedCount} expired booth bookings automatically.`
      );

      // Process waiting lists for freed booths
      for (const boothId of boothIds) {
        await processWaitingList(boothId);
      }
      console.log(
        `Deleted ${deleteResult.deletedCount} expired booth bookings automatically.`
      );
    }

    await sendWorkshopCertificates();
  } catch (error) {
    console.error(" Cron job error:", error.message);
  }
});
// ------------------------------------
