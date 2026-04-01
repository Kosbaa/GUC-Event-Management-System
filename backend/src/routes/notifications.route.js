import { Router } from "express";
import {
  createBroadcastNotification,
  createPersonalNotification,
  getUserNotifications,
  markNotificationAsRead,
  // convenience routes
  createNewEventBroadcast,
  notifyWorkshopRequestSubmitted,
  notifyWorkshopDecision,
  createNewLoyaltyPartnerBroadcast,
  notifyPendingVendorRequests,
  dismissNotification,
  deleteNotification,
  getUserNotificationsCount,
  markAllNotificationsAsRead,
  getDismissedNotificationsForUser,
  restoreNotificationForUser,
  deleteNotificationUserState,
  dismissAllNotificationsForUser,
} from "../controllers/notifications.controller.js";
import { authMiddleware} from "../middlewares/auth.js";

const router = Router();

// All require an authenticated user (you'll handle role on frontend for now)
router.use(authMiddleware);

/* Generic */
router.post("/broadcast", createBroadcastNotification);
router.post("/personal", createPersonalNotification);
router.get("/user", getUserNotifications);
router.patch("/read/:templateId",authMiddleware,markNotificationAsRead);

/* Convenience routes for your named requirements */
router.post("/x/new-event", createNewEventBroadcast);
router.post("/x/workshop-request-submitted", notifyWorkshopRequestSubmitted);
router.post("/x/workshop-decision", notifyWorkshopDecision);
router.post("/x/new-loyalty-partner", createNewLoyaltyPartnerBroadcast);
router.post("/x/pending-vendor-requests", notifyPendingVendorRequests);
router.delete("/user-all", authMiddleware, dismissAllNotificationsForUser);
router.delete("/user/:templateId",authMiddleware, dismissNotification);
router.delete("/:templateId", deleteNotification);
router.get("/user/count",getUserNotificationsCount);
router.patch("/user/mark-all-read", authMiddleware,markAllNotificationsAsRead);
router.get("/notifications/user/dismissed", authMiddleware, getDismissedNotificationsForUser);
router.patch("/notifications/user/restore/:templateId", authMiddleware, restoreNotificationForUser);
router.delete("/notifications/user/state/:templateId", authMiddleware, deleteNotificationUserState);



export default router;
