import cron from "node-cron";
import NotificationTemplate from "../models/notificationsTemplate.model.js";
import NotificationUser from "../models/notificationUser.model.js";

const DAYS = 7;

export function startMidnightExpiryCron() {
  // Runs every day at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);

      // 1) Find all templates older than X days
      const oldTemplates = await NotificationTemplate.find({
        createdAt: { $lte: cutoff },
      }).select("_id");

      if (!oldTemplates.length) {
        console.log("[notif-expiry] no old templates to delete.");
        return;
      }

      const ids = oldTemplates.map((t) => t._id);

      // 2) Delete all NotificationUser rows linked to these templates
      const userRes = await NotificationUser.deleteMany({
        templateId: { $in: ids },
      });

      // 3) Delete the templates themselves
      const tplRes = await NotificationTemplate.deleteMany({
        _id: { $in: ids },
      });

      console.log(
        `[notif-expiry] deleted ${tplRes.deletedCount} templates + ${userRes.deletedCount} user states (older than ${DAYS} days).`
      );
    } catch (err) {
      console.error("[notif-expiry] error:", err);
    }
  });
}
