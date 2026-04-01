import PointsConfig from "../models/pointsConfig.model.js";
import PointsTransaction from "../models/pointsTransaction.model.js";
import Coupon from "../models/coupon.model.js";
import Student from "../models/student.model.js";

const ensureConfig = async () => {
  let cfg = await PointsConfig.findOne();
  if (!cfg) {
    cfg = await PointsConfig.create({});
  }
  return cfg;
};

const computePoints = (amountPaid) => {
  const numeric = Number(amountPaid) || 0;
  if (numeric <= 0) return 0;
  const cfg = global.__pointsConfigCache;
  if (!cfg) return 0;
  const per = Number(cfg.pointsPerAmount) || 0;
  const unit = Number(cfg.amountUnit) || 0;
  if (per <= 0 || unit <= 0) return 0;
  return Math.floor((numeric / unit) * per);
};

const refreshConfigCache = async () => {
  const cfg = await ensureConfig();
  global.__pointsConfigCache = cfg;
  return cfg;
};

export const getPointSettings = async (_req, res) => {
  try {
    const cfg = await ensureConfig();
    global.__pointsConfigCache = cfg;
    res.json(cfg);
  } catch (error) {
    console.error("Failed to load point settings", error);
    res.status(500).json({ message: "Failed to load point settings" });
  }
};

export const updatePointSettings = async (req, res) => {
  try {
    const { pointsPerAmount, amountUnit } = req.body || {};
    if (pointsPerAmount == null || amountUnit == null) {
      return res
        .status(400)
        .json({ message: "pointsPerAmount and amountUnit are required" });
    }
    const cfg = await PointsConfig.findOneAndUpdate(
      {},
      {
        pointsPerAmount: Number(pointsPerAmount),
        amountUnit: Number(amountUnit),
      },
      { new: true, upsert: true }
    );
    global.__pointsConfigCache = cfg;
    res.json({ message: "Settings updated", settings: cfg });
  } catch (error) {
    console.error("Failed to update point settings", error);
    res.status(500).json({ message: "Failed to update point settings" });
  }
};

export const getMyPoints = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const student = await Student.findById(userId).select("points");
    const history = await PointsTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      balance: student?.points || 0,
      history,
      settings: await ensureConfig(),
    });
  } catch (error) {
    console.error("Failed to fetch points", error);
    res.status(500).json({ message: "Failed to fetch points" });
  }
};

export const listCoupons = async (_req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error("Failed to list coupons", error);
    res.status(500).json({ message: "Failed to list coupons" });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      value,
      applicableEventType,
      priceInPoints,
    } = req.body || {};
    if (!code || value == null || !applicableEventType) {
      return res
        .status(400)
        .json({ message: "code, value, and applicableEventType are required" });
    }
    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    const coupon = await Coupon.create({
      code,
      description,
      discountType,
      value,
      applicableEventType,
      priceInPoints,
      createdBy: req.user?.id,
    });
    res.status(201).json(coupon);
  } catch (error) {
    console.error("Failed to create coupon", error);
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndUpdate(id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json(coupon);
  } catch (error) {
    console.error("Failed to update coupon", error);
    res.status(500).json({ message: "Failed to update coupon" });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Failed to delete coupon", error);
    res.status(500).json({ message: "Failed to delete coupon" });
  }
};

export const getMyCoupons = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const student = await Student.findById(userId)
      .populate("myCoupons.couponId")
      .select("myCoupons");
    const coupons =
      student?.myCoupons?.map((c) => ({
        couponId: c.couponId?._id || c.couponId,
        code: c.couponId?.code,
        description: c.couponId?.description,
        discountType: c.couponId?.discountType,
        value: c.couponId?.value,
        applicableEventType: c.couponId?.applicableEventType,
        priceInPoints: c.couponId?.priceInPoints,
        used: c.used,
        obtainedAt: c.obtainedAt,
      })) || [];

    res.json(coupons);
  } catch (error) {
    console.error("Failed to fetch my coupons", error);
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
};

export const buyCoupon = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }
  const student = await Student.findById(userId).select("points myCoupons");
  const currentPoints = student?.points || 0;
  const cost = Number(coupon.priceInPoints) || 0;
  if (currentPoints < cost) {
    return res.status(400).json({ message: "Not enough points" });
  }

  student.points = currentPoints - cost;
  student.myCoupons.push({ couponId: coupon._id, used: false });
  await student.save();

    await PointsTransaction.create({
      user: userId,
      type: "spend",
      amount: cost,
      description: `Bought coupon ${coupon.code}`,
    });

    res.json({
      message: "Coupon purchased",
      balance: student.points,
      coupon,
    });
  } catch (error) {
    console.error("Failed to buy coupon", error);
    res.status(500).json({ message: "Failed to buy coupon" });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { couponId, eventType, price } = req.body || {};
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    if (coupon.applicableEventType && coupon.applicableEventType !== eventType) {
      return res
        .status(400)
        .json({ message: "Coupon not applicable to this event type" });
    }
    const student = await Student.findById(userId).select("myCoupons");
    const owned = student?.myCoupons?.find(
      (c) => String(c.couponId) === String(coupon._id) && !c.used
    );
    if (!owned) {
      return res.status(400).json({ message: "You do not own this coupon" });
    }
    const basePrice = Number(price) || 0;
    let discounted = basePrice;
    if (coupon.discountType === "percentage") {
      discounted = basePrice * (1 - (Number(coupon.value) || 0) / 100);
    } else {
      discounted = basePrice - (Number(coupon.value) || 0);
    }
    discounted = Math.max(0, discounted);

    res.json({
      discountedPrice: discounted,
      discount: basePrice - discounted,
    });
  } catch (error) {
    console.error("Failed to apply coupon", error);
    res.status(500).json({ message: "Failed to apply coupon" });
  }
};

export const markCouponAsUsed = async ({ userId, couponId }) => {
  if (!userId || !couponId) return;
  await Student.updateOne(
    { _id: userId, "myCoupons.couponId": couponId },
    { $set: { "myCoupons.$.used": true } }
  );
};

export const awardPoints = async ({ userId, amount, description }) => {
  if (!userId) return { awarded: 0 };
  const cfg = global.__pointsConfigCache || (await refreshConfigCache());
  const points = computePoints(amount);
  if (points <= 0) return { awarded: 0 };
  const student = await Student.findById(userId).select("points");
  if (student) {
    student.points = (student.points || 0) + points;
    await student.save();
  }
  await PointsTransaction.create({
    user: userId,
    type: "earn",
    amount: points,
    description: description || "Event payment",
  });
  return { awarded: points };
};

refreshConfigCache().catch(() => {});

export const validateCouponInternal = async ({ userId, couponId, eventType, price }) => {
  const coupon = await Coupon.findById(couponId);
    if (!coupon) {
    return { ok: false, reason: "Coupon not found" };
  }
  if (coupon.applicableEventType && coupon.applicableEventType !== eventType) {
    return { ok: false, reason: "Coupon not applicable to this event type" };
  }
  const student = await Student.findById(userId).select("myCoupons");
  const owned = student?.myCoupons?.find(
    (c) => String(c.couponId) === String(coupon._id) && !c.used
  );
  if (!owned) return { ok: false, reason: "You do not own this coupon" };
  const base = Number(price) || 0;
  let discounted = base;
  if (coupon.discountType === "percentage") {
    discounted = base * (1 - (Number(coupon.value) || 0) / 100);
  } else {
    discounted = base - (Number(coupon.value) || 0);
  }
  discounted = Math.max(0, discounted);
  return {
    ok: true,
    coupon,
    discounted,
    discount: base - discounted,
  };
};
