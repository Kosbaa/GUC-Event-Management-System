import express from "express";
import LoyaltyApplication from "../models/loyaltyApplication.js";
import Vendor from "../models/vendor.model.js";
import { authMiddleware } from "../middlewares/auth.js";
import { createNewLoyaltyPartnerBroadcast, notifyPendingLoyaltyApplication } from "../controllers/notifications.controller.js";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// --------------------
// Multer setup for in-memory uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// --------------------
// POST /api/loyalty/apply
router.post("/apply", upload.single("termsFile"), async (req, res) => {
  try {
    const { vendorId, discountRate, promoCode } = req.body;
    const file = req.file;

    if (!vendorId || !discountRate || !file) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newApp = new LoyaltyApplication({
      vendorId,
      discountRate,
      promoCode,
      termsFile: {
        data: file.buffer,
        contentType: file.mimetype || "application/pdf",
        originalName: file.originalname || "loyalty-terms.pdf",
        uploadedAt: new Date(),
      },
      status: "pending",
    });

    await newApp.save();
    console.log(`[Loyalty Apply] Application saved, vendorId: ${vendorId}`);

    // Notify EventOffice and Admin about the new application
    try {
      console.log(`[Loyalty Apply] Fetching vendor details for ID: ${vendorId}`);
      const vendor = await Vendor.findById(vendorId).select("companyName");
      console.log(`[Loyalty Apply] Vendor found:`, vendor);

      if (vendor) {
        console.log(`[Loyalty Apply] Preparing notification for ${vendor.companyName}`);

        // Build message with promo code if available
        let message = `${vendor.companyName} has submitted a loyalty program application with ${discountRate}% discount`;
        if (promoCode) {
          message += ` and promo code: ${promoCode}`;
        }
        message += `.`;

        const notificationReq = {
          user: req.user,
          body: {
            title: `New loyalty application from ${vendor.companyName}`,
            message: message,
            data: {
              vendorId: vendorId,
              vendorName: vendor.companyName,
              discountRate: discountRate,
              promoCode: promoCode,
              applicationId: newApp._id,
            },
          },
        };

        const notificationRes = {
          status: () => ({ json: () => { } }),
          json: () => { },
        };

        console.log(`[Loyalty Apply] Calling notifyPendingLoyaltyApplication...`);
        await notifyPendingLoyaltyApplication(notificationReq, notificationRes);
        console.log(`[Loyalty Apply] Notification sent to EventOffice and Admin for ${vendor.companyName}`);
      } else {
        console.log(`[Loyalty Apply] Vendor not found for ID: ${vendorId}`);
      }
    } catch (notificationError) {
      console.error("Failed to send loyalty application notification:", notificationError);
    }

    res.status(201).json(newApp);
  } catch (err) {
    console.error("Error saving loyalty application:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// --------------------
// GET /api/loyalty/vendor/:vendorId
router.get("/vendor/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const orClauses = [];

    if (mongoose.Types.ObjectId.isValid(vendorId)) {
      orClauses.push({ vendorId: new mongoose.Types.ObjectId(vendorId) });
    }

    orClauses.push({ vendorId: vendorId });

    const applications = await LoyaltyApplication.find({ $or: orClauses })
      .select("-termsFile.data")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// PATCH /api/loyalty/cancel/:id
router.patch("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await LoyaltyApplication.findById(id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    application.status = "canceled";
    await application.save();

    res.json({ message: "Application canceled successfully", application });
  } catch (error) {
    console.error("Error canceling application:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// DELETE /api/loyalty/:id (vendor can remove archived requests)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await LoyaltyApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    const isVendorOwner =
      userRole === "Vendor" &&
      userId &&
      application.vendorId?.toString() === String(userId);
    const isPrivileged = ["Admin", "Event Office"].includes(userRole);

    if (!isVendorOwner && !isPrivileged) {
      return res.status(403).json({ message: "Access denied" });
    }

    const status = String(application.status || "").toLowerCase();
    if (isVendorOwner && ["pending", "submitted"].includes(status)) {
      return res.status(400).json({
        message: "Cancel a pending application instead of deleting it.",
      });
    }

    await application.deleteOne();
    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// GET /api/loyalty/partners
router.get("/partners", async (req, res) => {
  try {
    const partners = await LoyaltyApplication.find({ status: "approved" })
      .populate("vendorId", "companyName email")
      .select("-termsFile.data")
      .lean();

    const formatted = partners.map((p) => ({
      _id: p._id,
      vendor: p.vendorId,
      vendorName: p.vendorId?.companyName || "Unknown Vendor",
      discountRate: p.discountRate,
      promoCode: p.promoCode,
      termsFile: p.termsFile
        ? {
          originalName: p.termsFile.originalName || "terms.pdf",
          contentType: p.termsFile.contentType,
        }
        : null,
      hasTermsFile: Boolean(p.termsFile),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ message: "Failed to fetch loyalty partners." });
  }
});

// --------------------
// Admin-only middleware
function adminOnly(req, res, next) {
  const allowed = ["Admin", "Event Office"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
}

// --------------------
// GET /api/loyalty/all
router.get("/all", authMiddleware, adminOnly, async (req, res) => {
  try {
    const applications = await LoyaltyApplication.find()
      .populate("vendorId", "companyName email")
      .select("-termsFile.data")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error("Error fetching all applications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// PATCH /api/loyalty/approve/:id
router.patch("/approve/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await LoyaltyApplication.findById(id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    application.status = "approved";
    await application.save();

    // Send notification to students and faculty about the new loyalty partner
    try {
      const vendor = await Vendor.findById(application.vendorId).select("companyName");
      if (vendor) {
        console.log(`[Loyalty Approve] Sending notification for ${vendor.companyName}`);

        // Build message with promo code if available
        let message = `${vendor.companyName} is now a loyalty partner! Enjoy ${application.discountRate}% discount`;
        if (application.promoCode) {
          message += ` with promo code: ${application.promoCode}`;
        } else {
          message += `.`;
        }

        const notificationReq = {
          user: req.user,
          body: {
            title: `New loyalty program partner: ${vendor.companyName}`,
            message: message,
            data: {
              vendorId: application.vendorId,
              vendorName: vendor.companyName,
              discountRate: application.discountRate,
              promoCode: application.promoCode,
            },
          },
        };

        const notificationRes = {
          status: () => ({ json: () => { } }),
          json: () => { },
        };

        await createNewLoyaltyPartnerBroadcast(notificationReq, notificationRes);
        console.log(`[Loyalty Approve] Notification sent successfully!`);
      }
    } catch (notificationError) {
      console.error("Failed to send loyalty partner notification:", notificationError);
    }

    res.json({ message: "Application approved successfully", application });
  } catch (error) {
    console.error("Error approving application:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// PATCH /api/loyalty/reject/:id
router.patch("/reject/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await LoyaltyApplication.findById(id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    application.status = "rejected";
    await application.save();

    res.json({ message: "Application rejected successfully", application });
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// DELETE /api/loyalty/:id - remove archived application (vendor owner or admin)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await LoyaltyApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    const isVendorOwner =
      userRole === "Vendor" &&
      userId &&
      application.vendorId?.toString() === String(userId);
    const isPrivileged = ["Admin", "Event Office"].includes(userRole);

    if (!isVendorOwner && !isPrivileged) {
      return res.status(403).json({ message: "Access denied" });
    }

    const status = String(application.status || "").toLowerCase();
    if (isVendorOwner && ["pending", "submitted"].includes(status)) {
      return res.status(400).json({
        message: "Please cancel a pending application instead of deleting it.",
      });
    }

    await application.deleteOne();
    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// GET /api/loyalty/:id/terms - download terms file (auth required)
router.get("/:id/terms", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await LoyaltyApplication.findById(id)
      .select("termsFile vendorId");

    if (!application || !application.termsFile) {
      return res.status(404).json({ message: "Terms file not found." });
    }

    const userRole = req.user?.role || "";
    const userId = req.user?.id || req.user?._id?.toString();
    const isVendorOwner =
      userRole === "Vendor" &&
      userId &&
      application.vendorId &&
      application.vendorId.toString() === userId.toString();
    const privilegedRoles = ["Admin", "Event Office", "Student", "Staff", "Professor", "TA"];
    if (!isVendorOwner && !privilegedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Not authorized to view this file." });
    }

    const fileDoc = application.termsFile;

    // Legacy support: file path stored as string
    if (typeof fileDoc === "string") {
      const legacyPath = fileDoc;
      if (!fs.existsSync(legacyPath)) {
        return res.status(404).json({ message: "Terms file not found on disk." });
      }
      const fileName = path.basename(legacyPath);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );
      return fs.createReadStream(legacyPath).pipe(res);
    }

    const { data, contentType, originalName } = fileDoc || {};
    if (!data) {
      return res.status(404).json({ message: "Terms file data missing." });
    }

    res.setHeader("Content-Type", contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${originalName || "loyalty-terms.pdf"}"`
    );
    return res.send(data);
  } catch (error) {
    console.error("Error downloading terms file:", error);
    res.status(500).json({ message: "Failed to download terms file." });
  }
});

export default router;
