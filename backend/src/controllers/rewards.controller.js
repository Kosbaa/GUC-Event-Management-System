import PointsSetting from "../models/pointsSetting.model.js";
import PointsBalance from "../models/pointsBalance.model.js";
import Coupon from "../models/coupon.model.js";
import UserCoupon from "../models/userCoupon.model.js";

const isEventOfficeOrAdmin = (role) =>
  role === "Event Office" || role === "Admin";

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const getOrCreateSettings = async () => {
  let settings = await PointsSetting.findOne();
  if (!settings) {
    settings = await PointsSetting.create({});
  }
  return settings;
};

const computeDiscount = (coupon, amount) => {
  const numericAmount = Number(amount) || 0;
  if (coupon.discountType === "percent") {
    const cappedPercent = Math.max(0, Math.min(100, Number(coupon.discountValue) || 0));
    return (numericAmount * cappedPercent) / 100;
  }
  return Math.max(0, Number(coupon.discountValue) || 0);
};

export const getPointSettings = async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    console.error("Failed to load point settings", error);
    res.status(500).json({ message: "Failed to load point settings" });
  }
};

export const updatePointSettings = async (req, res) => {
  try {
    if (!isEventOfficeOrAdmin(req.user?.role)) {
      return res.status(403).json({ message: "Not authorized to update settings" });
    }

    const { pointsPerAmount, amountUnit } = req.body || {};
    if (pointsPerAmount == null || amountUnit == null) {
      return res.status(400).json({ message: "pointsPerAmount and amountUnit are required" });
    }

    const settings = await PointsSetting.findOneAndUpdate(
      {},
      {
        pointsPerAmount: Number(pointsPerAmount),
        amountUnit: Number(amountUnit),
      },
      { new: true, upsert: true }
    );

    res.json({ message: "Settings updated", settings });
  } catch (error) {
    console.error("Failed to update point settings", error);
    res.status(500).json({ message: "Failed to update point settings" });
  }
};

export const getMyPoints = async (req, res) => {
  try {
    const { id, role } = req.user || {};
    if (!id) return res.status(401).json({ message: "Authentication required" });

    const balance = await PointsBalance.findOne({ user: id, userRole: role });
    const settings = await getOrCreateSettings();

    res.json({
      balance: balance?.balance || 0,
      settings,
    });
  } catch (error) {
    console.error("Failed to fetch user points", error);
    res.status(500).json({ message: "Failed to fetch user points" });
  }
};

export const createCoupon = async (req, res) => {
  try {
    if (!isEventOfficeOrAdmin(req.user?.role)) {
      return res.status(403).json({ message: "Not authorized to create coupons" });
    }

    const {
      code,
      title,
      discountType = "amount",
      discountValue,
      pointCost = 0,
      maxRedemptions,
      validFrom,
      validTo,
      minAmount,
    } = req.body || {};

    if (!code || discountValue == null) {
      return res.status(400).json({ message: "code and discountValue are required" });
    }

    const normalizedCode = normalizeCode(code);
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      title,
      discountType,
      discountValue,
      pointCost,
      maxRedemptions,
      validFrom,
      validTo,
      minAmount,
      createdBy: req.user?.id,
    });

    res.status(201).json({ message: "Coupon created", coupon });
  } catch (error) {
    console.error("Failed to create coupon", error);
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

export const listActiveCoupons = async (_req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    const filtered = coupons.filter((coupon) => {
      if (coupon.validFrom && coupon.validFrom > now) return false;
      if (coupon.validTo && coupon.validTo < now) return false;
      if (
        coupon.maxRedemptions &&
        coupon.redemptionsUsed >= coupon.maxRedemptions
      )
        return false;
      return true;
    });
    res.json(filtered);
  } catch (error) {
    console.error("Failed to list coupons", error);
    res.status(500).json({ message: "Failed to list coupons" });
  }
};

export const validateCouponForAmount = async ({ code, amount, ownerId }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return { ok: false, reason: "Coupon code is required" };

  const coupon = await Coupon.findOne({ code: normalizedCode });
  if (!coupon) return { ok: false, reason: "Coupon not found" };

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return { ok: false, reason: "Coupon is not active yet" };
  }
  if (coupon.validTo && coupon.validTo < now) {
    return { ok: false, reason: "Coupon has expired" };
  }
  if (coupon.maxRedemptions && coupon.redemptionsUsed >= coupon.maxRedemptions) {
    return { ok: false, reason: "Coupon has reached its limit" };
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, reason: "Invalid amount for coupon application" };
  }
  if (coupon.minAmount && numericAmount < coupon.minAmount) {
    return {
      ok: false,
      reason: `Minimum amount to use this coupon is ${coupon.minAmount}`,
    };
  }

  const discount = computeDiscount(coupon, numericAmount);
  const payableAmount = Math.max(0, numericAmount - discount);

  if (coupon.pointCost && coupon.pointCost > 0 && ownerId) {
    const owned = await UserCoupon.findOne({
      user: ownerId,
      coupon: coupon._id,
      status: "owned",
    });
    if (!owned) {
      return {
        ok: false,
        reason: "You need to buy this coupon with points before using it.",
      };
    }
  }

  return {
    ok: true,
    coupon,
    discount,
    amount: payableAmount,
  };
};

export const finalizeCouponRedemption = async ({ code, ownerId }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return { ok: false, reason: "No coupon code provided" };

  const coupon = await Coupon.findOne({ code: normalizedCode });
  if (!coupon) return { ok: false, reason: "Coupon not found" };

  if (coupon.maxRedemptions && coupon.redemptionsUsed >= coupon.maxRedemptions) {
    return { ok: false, reason: "Coupon limit reached" };
  }

  coupon.redemptionsUsed = (coupon.redemptionsUsed || 0) + 1;
  await coupon.save();

  if (ownerId) {
    await UserCoupon.findOneAndUpdate(
      { user: ownerId, coupon: coupon._id, status: "owned" },
      { status: "used", usedAt: new Date() }
    );
  }

  return { ok: true, coupon };
};

export const awardPointsForPayment = async ({ userId, userRole, amountPaid }) => {
  const numericAmount = Number(amountPaid);
  if (!userId || !Number.isFinite(numericAmount)) {
    return { awarded: 0 };
  }

  const settings = await getOrCreateSettings();
  const per = Number(settings.pointsPerAmount) || 0;
  const unit = Number(settings.amountUnit) || 0;

  if (per <= 0 || unit <= 0) {
    return { awarded: 0 };
  }

  const multiplier = Math.floor(numericAmount / unit);
  const points = multiplier * per;
  if (points <= 0) return { awarded: 0 };

  const balanceDoc = await PointsBalance.findOneAndUpdate(
    { user: userId, userRole },
    { $inc: { balance: points } },
    { new: true, upsert: true }
  );

  return { awarded: points, balance: balanceDoc.balance };
};

export const getMyCoupons = async (req, res) => {
  try {
    const { id, role } = req.user || {};
    if (!id) return res.status(401).json({ message: "Authentication required" });

    const owned = await UserCoupon.find({ user: id, userRole: role, status: "owned" })
      .populate("coupon")
      .sort({ purchasedAt: -1 });

    const coupons = owned
      .map((entry) => entry.coupon)
      .filter(Boolean)
      .map((c) => ({
        _id: c._id,
        code: c.code,
        title: c.title,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minAmount: c.minAmount,
        validFrom: c.validFrom,
        validTo: c.validTo,
        pointCost: c.pointCost,
        maxRedemptions: c.maxRedemptions,
        redemptionsUsed: c.redemptionsUsed,
        createdAt: c.createdAt,
      }));

    res.json(coupons);
  } catch (error) {
    console.error("Failed to fetch user coupons", error);
    res.status(500).json({ message: "Failed to fetch user coupons" });
  }
};

export const buyCoupon = async (req, res) => {
  try {
    const { id, role } = req.user || {};
    const { code } = req.params;
    if (!id) return res.status(401).json({ message: "Authentication required" });

    const normalizedCode = normalizeCode(code);
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
      return res.status(400).json({ message: "Coupon not active yet" });
    }
    if (coupon.validTo && coupon.validTo < now) {
      return res.status(400).json({ message: "Coupon expired" });
    }
    if (coupon.maxRedemptions && coupon.redemptionsUsed >= coupon.maxRedemptions) {
      return res.status(400).json({ message: "Coupon limit reached" });
    }

    const cost = Number(coupon.pointCost) || 0;
    if (cost <= 0) {
      return res.status(400).json({ message: "This coupon does not require points" });
    }

    const existing = await UserCoupon.findOne({
      user: id,
      coupon: coupon._id,
      status: "owned",
    });
    if (existing) {
      return res.status(400).json({ message: "You already own this coupon" });
    }

    const balanceDoc = await PointsBalance.findOne({ user: id, userRole: role });
    const currentBalance = balanceDoc?.balance || 0;
    if (currentBalance < cost) {
      return res.status(400).json({ message: "Not enough points to buy this coupon" });
    }

    await PointsBalance.findOneAndUpdate(
      { user: id, userRole: role },
      { $inc: { balance: -cost } },
      { upsert: true }
    );

    const owned = await UserCoupon.create({
      user: id,
      userRole: role,
      coupon: coupon._id,
    });

    res.json({
      message: "Coupon purchased with points",
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        pointCost: coupon.pointCost,
        minAmount: coupon.minAmount,
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
      },
      owned,
      newBalance: currentBalance - cost,
    });
  } catch (error) {
    console.error("Failed to buy coupon", error);
    res.status(500).json({ message: "Failed to buy coupon" });
  }
};
