import LoyaltyApplication from "../models/loyaltyApplication.js";
import Vendor from "../models/vendor.model.js";
import { createNewLoyaltyPartnerBroadcast } from "./notifications.controller.js";

// POST /api/loyalty/apply
export const applyLoyaltyProgram = async (req, res) => {
  try {
    const { vendorId, discountRate, promoCode } = req.body;

    if (!vendorId || discountRate === undefined) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Optional: prevent duplicate pending applications
    const existingPending = await LoyaltyApplication.findOne({
      vendorId,
      status: "pending",
    });
    if (existingPending) {
      return res
        .status(400)
        .json({ message: "You already have a pending application." });
    }

    const newApplication = await LoyaltyApplication.create({
      vendorId,
      discountRate,
      promoCode,
    });

    res.status(201).json({
      message: "Application submitted successfully",
      application: newApplication,
    });
  } catch (error) {
    console.error("Error applying for loyalty program:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/loyalty/vendor/:vendorId
export const getVendorApplications = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const apps = await LoyaltyApplication.find({ vendorId }).sort({
      createdAt: -1,
    });
    res.json(apps);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/loyalty/:id/status (admin use)
export const updateLoyaltyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const app = await LoyaltyApplication.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('vendorId');

    if (!app) return res.status(404).json({ message: "Application not found" });

    // If approved, notify students and faculty about the new loyalty partner
    if (status === "approved") {
      console.log("[updateLoyaltyStatus] Application approved, sending notification...");
      console.log("[updateLoyaltyStatus] Application data:", {
        vendorId: app.vendorId,
        discountRate: app.discountRate
      });

      try {
        // Get the actual vendorId (might be populated or just an ID)
        const vendorId = app.vendorId?._id || app.vendorId;
        console.log("[updateLoyaltyStatus] Fetching vendor with ID:", vendorId);

        const vendor = await Vendor.findById(vendorId).select("companyName");
        console.log("[updateLoyaltyStatus] Vendor found:", vendor);

        if (vendor) {
          const notificationReq = {
            user: req.user,
            body: {
              title: `New loyalty program partner: ${vendor.companyName}`,
              message: `${vendor.companyName} is now a loyalty partner! Enjoy ${app.discountRate}% discount.`,
              data: {
                vendorId: vendorId,
                vendorName: vendor.companyName,
                discountRate: app.discountRate,
                promoCode: app.promoCode,
              },
            },
          };

          const notificationRes = {
            status: () => ({ json: () => { } }),
            json: () => { },
          };

          console.log("[updateLoyaltyStatus] Calling createNewLoyaltyPartnerBroadcast...");
          await createNewLoyaltyPartnerBroadcast(notificationReq, notificationRes);
          console.log("[updateLoyaltyStatus] Notification sent successfully!");
        } else {
          console.log("[updateLoyaltyStatus] Vendor not found!");
        }
      } catch (notificationError) {
        console.error("Failed to send loyalty partner notification:", notificationError);
      }
    }

    res.json({ message: "Status updated", application: app });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server error" });
  }
};
