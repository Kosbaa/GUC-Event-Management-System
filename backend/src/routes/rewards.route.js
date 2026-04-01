import { Router } from "express";
import {
  getPointSettings,
  updatePointSettings,
  getMyPoints,
  createCoupon,
  listActiveCoupons,
  getMyCoupons,
  buyCoupon,
} from "../controllers/rewards.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/points/settings", authMiddleware, getPointSettings);
router.put("/points/settings", authMiddleware, updatePointSettings);
router.get("/points/balance", authMiddleware, getMyPoints);
router.get("/my-coupons", authMiddleware, getMyCoupons);

router.post("/coupons", authMiddleware, createCoupon);
router.get("/coupons", authMiddleware, listActiveCoupons);
router.post("/coupons/:code/buy", authMiddleware, buyCoupon);

export default router;
