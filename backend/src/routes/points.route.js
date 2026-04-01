import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  getMyPoints,
  buyCoupon,
  getMyCoupons,
  applyCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listCoupons,
  getPointSettings,
  updatePointSettings,
} from "../controllers/points.controller.js";

const router = Router();

router.get("/points/my", authMiddleware, getMyPoints);
router.get("/coupons/my", authMiddleware, getMyCoupons);
router.post("/coupons/apply", authMiddleware, applyCoupon);
router.post("/coupons/buy/:id", authMiddleware, buyCoupon);

// admin/event office
router.get("/coupons", authMiddleware, listCoupons);
router.post("/coupons", authMiddleware, createCoupon);
router.put("/coupons/:id", authMiddleware, updateCoupon);
router.delete("/coupons/:id", authMiddleware, deleteCoupon);

router.get("/points/settings", authMiddleware, getPointSettings);
router.put("/points/settings", authMiddleware, updatePointSettings);

export default router;
