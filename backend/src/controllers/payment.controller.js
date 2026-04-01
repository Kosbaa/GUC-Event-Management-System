import Stripe from "stripe";
import Wallet from "../models/wallet.model.js";
import Bazaar from "../models/bazaar.model.js";
import Trip from "../models/trip.model.js";
import Workshop from "../models/workshop.model.js";
import BoothBooking from "../models/BoothBooking.js";
import Student from "../models/student.model.js";
import Faculty from "../models/faculty.model.js";
import Vendor from "../models/vendor.model.js";
import { sendEmail } from "../lib/mailer.js";
import {
  validateCouponInternal,
  markCouponAsUsed,
  awardPoints,
} from "./points.controller.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const DEFAULT_CURRENCY = "egp";
const MIN_CHECKOUT_AMOUNT = 500; // 5 EGP expressed in qirsh/cents
const EVENT_REGISTRATION_INTENT = "event_registration_payment";

const eventModels = {
  workshop: Workshop,
  trip: Trip,
};

const contactRoleModelMap = {
  Student: Student,
  Faculty: Faculty,
  Staff: Faculty,
  TA: Faculty,
  Professor: Faculty,
  Vendor: Vendor,
};

const methodLabelMap = {
  stripe_card: "Card (Stripe)",
  wallet: "Wallet Balance",
};

const currencyFormatterCache = {};

const formatAmount = (value, currency = DEFAULT_CURRENCY) => {
  const normalized = currency?.toUpperCase() || DEFAULT_CURRENCY.toUpperCase();
  if (!currencyFormatterCache[normalized]) {
    currencyFormatterCache[normalized] = new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return currencyFormatterCache[normalized].format(Number(value || 0));
};

const buildRoleKey = (role) => {
  if (!role) return null;
  const normalized = String(role).trim();
  if (contactRoleModelMap[normalized]) return normalized;
  if (["Staff", "TA", "Professor"].includes(normalized)) return normalized;
  if (normalized === "Faculty") return "Faculty";
  return null;
};

const getUserContact = async ({ userId, role }) => {
  if (!userId) return null;
  const key = buildRoleKey(role);
  if (!key) return null;

  const Model = contactRoleModelMap[key];
  if (!Model) return null;

  const doc = await Model.findById(userId).select(
    "email firstName lastName companyName role"
  );

  if (!doc?.email) return null;

  const fullName =
    doc.companyName ||
    [doc.firstName, doc.lastName].filter(Boolean).join(" ").trim() ||
    doc.email;

  return {
    email: doc.email,
    name: fullName,
    role: doc.role || role || key,
  };
};

const sendPaymentReceiptEmail = async ({
  contact,
  amount,
  currency = DEFAULT_CURRENCY,
  method = "stripe_card",
  reference,
  contextLabel,
  extraLines = [],
}) => {
  if (!contact?.email || typeof amount !== "number") return;

  const formattedAmount = formatAmount(amount, currency);
  const methodLabel = methodLabelMap[method] || method || "Payment";
  const when = new Date().toLocaleString();
  const name = contact.name || "there";

  const extraHtml = extraLines
    .filter((line) => line?.label && line?.value)
    .map(
      (line) =>
        `<li><strong>${line.label}:</strong> ${line.value}</li>`
    )
    .join("");

  const extraText = extraLines
    .filter((line) => line?.label && line?.value)
    .map((line) => `${line.label}: ${line.value}`)
    .join("\n");

  const subject = `Payment Receipt - ${contextLabel || "GUC Events"}`;
  const textLines = [
    `Hello ${name},`,
    ``,
    `We received your payment for ${contextLabel || "your recent transaction"}.`,
    `Amount: ${formattedAmount}`,
    `Method: ${methodLabel}`,
    reference ? `Reference: ${reference}` : null,
    `Date: ${when}`,
    extraText ? `${extraText}` : null,
    ``,
    `Thank you,`,
    `GUC Events Team`,
  ].filter(Boolean);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6;">
      <p>Hello ${name},</p>
      <p>We received your payment for ${contextLabel || "your recent transaction"}.</p>
      <ul style="padding-left:18px;">
        <li><strong>Amount:</strong> ${formattedAmount}</li>
        <li><strong>Method:</strong> ${methodLabel}</li>
        ${reference ? `<li><strong>Reference:</strong> ${reference}</li>` : ""}
        <li><strong>Date:</strong> ${when}</li>
        ${extraHtml}
      </ul>
      <p>Thank you,<br/>GUC Events Team</p>
    </div>
  `;

  await sendEmail({
    to: contact.email,
    subject,
    text: textLines.join("\n"),
    html,
  });
};

const getEventFee = (eventType, event) => {
  const key = String(eventType || "").toLowerCase();
  if (key === "trip") {
    return Number(event?.price) || 0;
  }
  if (key === "workshop") {
    return Number(event?.priceToAttend) || 0;
  }
  return 0;
};

const getClientUrl = () => {
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  return base.replace(/\/$/, "");
};

const ensureStripeConfigured = (res) => {
  if (!stripe) {
    res
      .status(500)
      .json({ message: "Stripe secret key is not configured on the server." });
    return false;
  }
  return true;
};

const buildSuccessUrl = () =>
  process.env.STRIPE_SUCCESS_URL || getClientUrl();

const buildCancelUrl = () =>
  process.env.STRIPE_CANCEL_URL || getClientUrl();

const normalizeAmount = (amount) => {
  const parsed = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return Math.max(MIN_CHECKOUT_AMOUNT, Math.round(parsed));
};

const toMinorUnits = (value) =>
  Math.max(0, Math.round(Number(value || 0) * 100));

const getEventModel = (eventType) => {
  const key = String(eventType || "").toLowerCase();
  return eventModels[key];
};

const findEventAndRegistrant = async ({ eventType, eventId, userId }) => {
  const Model = getEventModel(eventType);
  if (!Model) return { reason: "Unsupported event type" };

  const event = await Model.findById(eventId);
  if (!event) return { reason: "Event not found" };

  const registrant = event.registrants.find(
    (reg) => reg.user.toString() === userId.toString()
  );

  if (!registrant) {
    return { reason: "Registration not found for this user", event };
  }

  if (!registrant.payment) {
    registrant.payment = {
      status: "pending",
      amountDue: getEventFee(eventType, event),
      amountPaid: 0,
    };
    await event.save();
  }

  return { event, registrant };
};

const markRegistrationPaymentComplete = async ({
  eventType,
  eventId,
  userId,
  amountPaid,
  paymentMethod,
  stripeReference,
  stripePaymentIntentId,
  couponId,
}) => {
  const { event, registrant, reason } = await findEventAndRegistrant({
    eventType,
    eventId,
    userId,
  });
  if (!event || !registrant) {
    return { updated: false, reason };
  }

  if (registrant.payment?.status === "paid") {
    return { updated: false, reason: "Registration already paid" };
  }

  const expectedAmount =
    typeof registrant.payment?.amountDue === "number"
      ? registrant.payment.amountDue
      : 0;

  const normalizedPaid =
    typeof amountPaid === "number" ? amountPaid / 100 : expectedAmount;

  const appliedCouponId = couponId || registrant.payment?.appliedCoupon;
  registrant.payment = {
    ...(registrant.payment || {}),
    status: "paid",
    method: paymentMethod,
    amountDue: expectedAmount,
    amountPaid: normalizedPaid,
    appliedCoupon: appliedCouponId,
    stripeSessionId: stripeReference || registrant.payment?.stripeSessionId,
    stripePaymentIntentId:
      stripePaymentIntentId || registrant.payment?.stripePaymentIntentId,
    paidAt: new Date(),
  };

  await event.save();
  const contact = await getUserContact({
    userId,
    role: registrant.userType,
  });
  if (contact) {
    const eventDateLabel = event.startDate
      ? new Date(event.startDate).toLocaleDateString()
      : "N/A";
    await sendPaymentReceiptEmail({
      contact,
      amount: normalizedPaid,
      currency: DEFAULT_CURRENCY,
      method: paymentMethod,
      reference: stripeReference,
      contextLabel: `Registration Payment - ${event.name}`,
      extraLines: [
        { label: "Event Type", value: String(eventType).toUpperCase() },
        { label: "Event Date", value: eventDateLabel },
        ],
      });
    }

  try {
    await awardPoints({
      userId,
      amount: normalizedPaid,
      description: `Paid ${event.name}`,
    });
  } catch (pointsErr) {
    console.error("Failed to award points after payment", pointsErr);
  }

  if (appliedCouponId) {
    try {
      await markCouponAsUsed({ userId, couponId: appliedCouponId });
    } catch (couponErr) {
      console.error("Failed to mark coupon used", couponErr);
    }
  }

  return { updated: true, event, registrant };
};

const debitWalletForRegistration = async ({
  userId,
  amountMinor,
  description,
  metadata,
}) => {
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    return { ok: false, reason: "Wallet not found" };
  }
  if (wallet.balance < amountMinor) {
    return { ok: false, reason: "Insufficient wallet balance" };
  }

  wallet.balance -= amountMinor;
  wallet.history.push({
    type: "debit",
    amount: amountMinor,
    currency: wallet.currency,
    description,
    metadata,
  });
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  return { ok: true, wallet };
};

const appendWalletCredit = async ({
  walletId,
  amount,
  currency,
  stripeReference,
  description,
}) => {
  if (!walletId) return { credited: false };
  const wallet = await Wallet.findById(walletId);
  if (!wallet) return { credited: false };

  const alreadyProcessed = wallet.history?.some(
    (tx) => tx.stripeReference && tx.stripeReference === stripeReference
  );
  if (alreadyProcessed) {
    return { credited: false, wallet };
  }

  wallet.balance += amount;
  wallet.history.push({
    type: "credit",
    amount,
    currency,
    description,
    stripeReference,
    metadata: { source: "stripe_checkout" },
  });
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  const contact = await getUserContact({
    userId: wallet.user,
    role: wallet.userRole,
  });
  if (contact) {
    await sendPaymentReceiptEmail({
      contact,
      amount: amount / 100,
      currency: currency || wallet.currency || DEFAULT_CURRENCY,
      method: "stripe_card",
      reference: stripeReference,
      contextLabel: "Wallet Top-Up",
      extraLines: description
        ? [{ label: "Description", value: description }]
        : [],
    });
  }

  return { credited: true, wallet };
};

const markVendorPaymentComplete = async ({
  bazaarId,
  vendorId,
  stripeReference,
  amountPaid,
}) => {
  const bazaar = await Bazaar.findById(bazaarId);
  if (!bazaar) return { updated: false, reason: "Bazaar not found" };

  const request = bazaar.vendorRequests.find(
    (r) => r.vendor.toString() === vendorId
  );
  if (!request) return { updated: false, reason: "Vendor request not found" };

  if (request.status !== "awaiting_payment") {
    return { updated: false, reason: "Vendor request is not awaiting payment" };
  }

  if (request.paymentDeadline && request.paymentDeadline < new Date()) {
    request.status = "pending";
    await bazaar.save();
    return { updated: false, reason: "Payment deadline expired" };
  }

  if (
    request.paymentIntentId &&
    request.paymentIntentId !== stripeReference
  ) {
    return {
      updated: false,
      reason: "Stripe reference mismatch for vendor request",
    };
  }

  const expectedAmount =
    typeof request.boothPrice === "number"
      ? Math.round(request.boothPrice * 100)
      : null;
  if (
    expectedAmount != null &&
    amountPaid != null &&
    expectedAmount !== amountPaid
  ) {
    return {
      updated: false,
      reason: "Paid amount does not match booth price",
    };
  }

  request.status = "accepted";
  request.paymentIntentId = stripeReference;
  request.paidAt = new Date();
  await bazaar.save();

  const contact = await getUserContact({ userId: vendorId, role: "Vendor" });
  const amountMajor =
    typeof amountPaid === "number"
      ? amountPaid / 100
      : request.boothPrice || 0;

  if (contact) {
    const startDateLabel = bazaar.startDate
      ? new Date(bazaar.startDate).toLocaleDateString()
      : "N/A";
    const endDateLabel = bazaar.endDate
      ? new Date(bazaar.endDate).toLocaleDateString()
      : "N/A";
    await sendPaymentReceiptEmail({
      contact,
      amount: amountMajor,
      currency: DEFAULT_CURRENCY,
      method: "stripe_card",
      reference: stripeReference,
      contextLabel: `Bazaar Payment - ${bazaar.name}`,
      extraLines: [
        {
          label: "Booth Size",
          value: request.boothSize || "N/A",
        },
        {
          label: "Event Dates",
          value: `${startDateLabel} - ${endDateLabel}`,
        },
      ],
    });
  }

  return { updated: true, bazaar, request };
};

const markBoothBookingPaymentComplete = async ({
  bookingId,
  vendorId,
  stripeReference,
  stripePaymentIntentId,
  amountPaid,
}) => {
  const booking = await BoothBooking.findById(bookingId);
  if (!booking) {
    return { updated: false, reason: "Booth booking not found" };
  }

  if (String(booking.vendor) !== String(vendorId)) {
    return { updated: false, reason: "Vendor mismatch for booking" };
  }

  if (booking.status !== "awaiting_payment") {
    return { updated: false, reason: "Booking is not awaiting payment" };
  }

  if (booking.paymentDeadline && booking.paymentDeadline < new Date()) {
    booking.status = "pending";
    booking.paymentDeadline = null;
    booking.payment = {
      ...(booking.payment || {}),
      status: "pending",
      deadline: null,
    };
    await booking.save();
    return { updated: false, reason: "Payment deadline expired" };
  }

  const expectedMinor = toMinorUnits(
    booking.boothPrice || booking.payment?.amountDue || 0
  );

  if (
    typeof amountPaid === "number" &&
    expectedMinor > 0 &&
    expectedMinor !== amountPaid
  ) {
    return {
      updated: false,
      reason: "Paid amount does not match booth booking amount",
    };
  }

  const amountPaidEgp =
    typeof amountPaid === "number" ? amountPaid / 100 : booking.boothPrice;

  booking.status = "approved";
  booking.paymentDeadline = null;
  booking.paymentIntentId = stripeReference;
  booking.payment = {
    ...(booking.payment || {}),
    status: "paid",
    method: "stripe_card",
    amountDue: booking.boothPrice || booking.payment?.amountDue || amountPaidEgp,
    amountPaid: amountPaidEgp,
    stripeSessionId: stripeReference,
    stripePaymentIntentId:
      stripePaymentIntentId || booking.payment?.stripePaymentIntentId,
    deadline: null,
    paidAt: new Date(),
  };

  await booking.save();
  const contact = await getUserContact({ userId: vendorId, role: "Vendor" });
  if (contact) {
    await sendPaymentReceiptEmail({
      contact,
      amount: amountPaidEgp,
      currency: DEFAULT_CURRENCY,
      method: "stripe_card",
      reference: stripeReference,
      contextLabel: "Booth Booking Payment",
      extraLines: [
        {
          label: "Company",
          value: booking.companyName || "N/A",
        },
        {
          label: "Duration",
          value: booking.duration || booking.dates || "N/A",
        },
      ],
    });
  }

  return { updated: true, booking };
};

export const createTestCheckoutSession = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const {
      amount = 5000,
      currency = DEFAULT_CURRENCY,
      label = "Sandbox Test Payment",
      description = "Test charge from Beit-Gedy portal",
    } = req.body || {};

    const normalizedAmount = normalizeAmount(amount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: label,
              description,
            },
            unit_amount: normalizedAmount,
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(),
      cancel_url: buildCancelUrl(),
      metadata: {
        portalUser: req.user?._id?.toString() || "anonymous",
        role: req.user?.role || "Guest",
        environment: "sandbox",
      },
    });

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    res.status(500).json({
      message: "Failed to create Stripe session",
      error: error.message,
    });
  }
};

export const createWalletTopUpSession = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { amount } = req.body || {};
    const normalizedAmount = normalizeAmount(amount);

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        userRole: req.user.role,
        history: [
          {
            type: "init",
            amount: 0,
            currency: DEFAULT_CURRENCY,
            description: "Wallet auto-created during top-up",
          },
        ],
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: "Wallet Top-Up",
              description: "Add funds to your campus wallet",
            },
            unit_amount: normalizedAmount,
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(),
      cancel_url: buildCancelUrl(),
      metadata: {
        intent: "wallet_topup",
        walletId: wallet._id.toString(),
        userId: req.user.id,
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Wallet top-up session error:", error);
    res.status(500).json({
      message: "Failed to start wallet top-up",
      error: error.message,
    });
  }
};

export const confirmWalletTopUp = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ message: "Stripe session not found for provided ID." });
    }

    if (session.metadata?.intent !== "wallet_topup") {
      return res
        .status(400)
        .json({ message: "Provided session is not a wallet top-up." });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Stripe session is not paid yet.",
        payment_status: session.payment_status,
      });
    }

    await appendWalletCredit({
      walletId: session.metadata.walletId,
      amount: session.amount_total,
      currency: session.currency || DEFAULT_CURRENCY,
      stripeReference: session.id,
      description: "Stripe Wallet Top-Up (manual confirmation)",
    });

    const wallet = await Wallet.findById(session.metadata.walletId);

    res.json({
      wallet,
      message: "Wallet credited successfully.",
    });
  } catch (error) {
    console.error("Confirm wallet top-up error:", error);
    res.status(500).json({
      message: "Failed to confirm wallet top-up",
      error: error.message,
    });
  }
};

export const createVendorBazaarPaymentSession = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;
    const { bazaarId, vendorId } = req.params;

    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) {
      return res.status(404).json({ message: "Bazaar not found" });
    }

    const request = bazaar.vendorRequests.find(
      (r) => r.vendor.toString() === vendorId
    );
    if (!request) {
      return res.status(404).json({ message: "Vendor request not found" });
    }

    if (req.user.role === "Vendor" && req.user.id !== vendorId) {
      return res.status(403).json({ message: "Unauthorized vendor access" });
    }

    if (request.status !== "awaiting_payment") {
      return res
        .status(400)
        .json({ message: "Request is not awaiting payment" });
    }

    if (
      request.paymentDeadline &&
      new Date(request.paymentDeadline) < new Date()
    ) {
      request.status = "pending";
      await bazaar.save();
      return res
        .status(400)
        .json({ message: "Payment deadline has expired" });
    }

    if (typeof request.boothPrice !== "number" || request.boothPrice <= 0) {
      return res.status(400).json({
        message: "Booth price is missing. Please contact Event Office.",
      });
    }

    const amountInMinor = Math.round(request.boothPrice * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: `${bazaar.name} - ${request.boothSize} Booth`,
              description: `Vendor booth payment for ${bazaar.name}`,
            },
            unit_amount: amountInMinor,
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(),
      cancel_url: buildCancelUrl(),
      metadata: {
        intent: "vendor_bazaar_payment",
        bazaarId: bazaarId,
        vendorId,
      },
    });

    request.paymentIntentId = session.id;
    await bazaar.save();

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Vendor payment session error:", error);
    res.status(500).json({
      message: "Failed to start vendor payment",
      error: error.message,
    });
  }
};

export const createVendorBoothPaymentSession = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;
    const { bookingId } = req.params;
    const requesterId =
      req.user?._id?.toString?.() || req.user?.id || req.user?._id;

    if (!requesterId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const booking = await BoothBooking.findById(bookingId).populate(
      "booth",
      "boothName location"
    );
    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found" });
    }

    if (
      req.user.role === "Vendor" &&
      booking.vendor.toString() !== String(requesterId)
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized vendor access for this booking" });
    }

    if (booking.status !== "awaiting_payment") {
      return res
        .status(400)
        .json({ message: "Booking is not awaiting payment" });
    }

    if (
      booking.paymentDeadline &&
      new Date(booking.paymentDeadline) < new Date()
    ) {
      booking.status = "pending";
      booking.paymentDeadline = null;
      booking.payment = {
        ...(booking.payment || {}),
        status: "pending",
        deadline: null,
      };
      await booking.save();
      return res
        .status(400)
        .json({ message: "Payment deadline has expired. Please reapply." });
    }

    const amountDue = booking.boothPrice || booking.payment?.amountDue;
    if (!amountDue || amountDue <= 0) {
      return res.status(400).json({
        message: "Booth price is unavailable. Please contact Event Office.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: booking.booth?.boothName || "Booth Rental",
              description: `Booth booking for ${booking.companyName}`,
            },
            unit_amount: toMinorUnits(amountDue),
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(),
      cancel_url: buildCancelUrl(),
      metadata: {
        intent: "vendor_booth_payment",
        bookingId: booking._id.toString(),
        vendorId: booking.vendor.toString(),
      },
    });

    booking.payment = {
      ...(booking.payment || {}),
      stripeSessionId: session.id,
      stripePaymentIntentId: null,
    };
    booking.paymentIntentId = session.id;
    await booking.save();

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Vendor booth payment session error:", error);
    res.status(500).json({
      message: "Failed to start booth payment",
      error: error.message,
    });
  }
};

export const confirmVendorBazaarPayment = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ message: "Stripe session not found for provided ID." });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Stripe session is not paid yet.",
        payment_status: session.payment_status,
      });
    }

    const intent = session.metadata?.intent;

    if (intent === "vendor_bazaar_payment") {
      const { bazaarId, vendorId } = session.metadata;
      const result = await markVendorPaymentComplete({
        bazaarId,
        vendorId,
        stripeReference: session.id,
        amountPaid: session.amount_total,
      });

      if (!result.updated) {
        return res.status(400).json({
          message: "Unable to finalize vendor payment",
          reason: result.reason,
        });
      }
    } else if (intent === "vendor_booth_payment") {
      const { bookingId, vendorId } = session.metadata;
      const result = await markBoothBookingPaymentComplete({
        bookingId,
        vendorId,
        stripeReference: session.id,
        stripePaymentIntentId: session.payment_intent,
        amountPaid: session.amount_total,
      });

      if (!result.updated) {
        return res.status(400).json({
          message: "Unable to finalize vendor payment",
          reason: result.reason,
        });
      }
    } else {
      return res.status(400).json({
        message: "Provided session is not a supported vendor payment.",
      });
    }

    res.json({ message: "Vendor payment confirmed." });
  } catch (error) {
    console.error("Confirm vendor payment error:", error);
    res.status(500).json({
      message: "Failed to confirm vendor payment",
      error: error.message,
    });
  }
};

export const createRegistrationPaymentSession = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;
    const { eventType, eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { event, registrant, reason } = await findEventAndRegistrant({
      eventType,
      eventId,
      userId,
    });

    if (!event || !registrant) {
      return res.status(404).json({ message: reason || "Registration not found" });
    }

    if (registrant.payment?.status === "paid") {
      return res
        .status(400)
        .json({ message: "Registration is already paid." });
    }

    const amountDue =
      typeof registrant.payment?.amountDue === "number"
        ? registrant.payment.amountDue
        : 0;

    if (amountDue <= 0) {
      return res
        .status(400)
        .json({ message: "This registration does not require payment." });
    }

    const { couponId } = req.body || {};
    let payableAmount = amountDue;
    let appliedCouponId = null;
    let discountApplied = 0;

    if (couponId) {
      const result = await validateCouponInternal({
        userId,
        couponId,
        eventType: String(eventType || "").toLowerCase(),
        price: amountDue,
      });
      if (!result.ok) {
        return res.status(400).json({ message: result.reason });
      }
      payableAmount = result.discounted;
      discountApplied = result.discount;
      appliedCouponId = couponId;
    }

    const amountInMinor = toMinorUnits(payableAmount);
    if (amountInMinor <= 0) {
      return res
        .status(400)
        .json({ message: "Unable to determine a valid payment amount." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: `${event.name} (${String(eventType).toUpperCase()})`,
              description: `Registration fee for ${event.name}`,
            },
            unit_amount: amountInMinor,
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(),
      cancel_url: buildCancelUrl(),
        metadata: {
          intent: EVENT_REGISTRATION_INTENT,
          eventType: String(eventType || "").toLowerCase(),
          eventId,
          userId,
          couponId: appliedCouponId || "",
        },
      });

    registrant.payment = {
      ...(registrant.payment || {}),
      status: "pending",
      amountDue: payableAmount,
      stripeSessionId: session.id,
      appliedCoupon: appliedCouponId,
      discountApplied,
    };
    await event.save();

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Registration payment session error:", error);
    res.status(500).json({
      message: "Failed to start registration payment",
      error: error.message,
    });
  }
};

export const confirmRegistrationPayment = async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ message: "Stripe session not found for provided ID." });
    }

    if (session.metadata?.intent !== EVENT_REGISTRATION_INTENT) {
      return res.status(400).json({
        message: "Provided session is not a registration payment.",
      });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Stripe session is not paid yet.",
        payment_status: session.payment_status,
      });
    }

    const { eventType, eventId, userId, couponId } = session.metadata;
    const result = await markRegistrationPaymentComplete({
      eventType,
      eventId,
      userId,
      amountPaid: session.amount_total,
      paymentMethod: "stripe_card",
      stripeReference: session.id,
      stripePaymentIntentId: session.payment_intent,
      couponId,
    });

    if (!result.updated) {
      return res.status(400).json({
        message: "Unable to finalize registration payment",
        reason: result.reason,
      });
    }

    res.json({ message: "Registration payment confirmed." });
  } catch (error) {
    console.error("Confirm registration payment error:", error);
    res.status(500).json({
      message: "Failed to confirm registration payment",
      error: error.message,
    });
  }
};

export const payRegistrationWithWallet = async (req, res) => {
  try {
    const { eventType, eventId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { event, registrant, reason } = await findEventAndRegistrant({
      eventType,
      eventId,
      userId,
    });

    if (!event || !registrant) {
      return res.status(404).json({ message: reason || "Registration not found" });
    }

    if (registrant.payment?.status === "paid") {
      return res
        .status(400)
        .json({ message: "Registration is already paid." });
    }

    const amountDue =
      typeof registrant.payment?.amountDue === "number"
        ? registrant.payment.amountDue
        : 0;

    if (amountDue <= 0) {
      return res
        .status(400)
        .json({ message: "This registration does not require payment." });
    }

    const { couponId } = req.body || {};
    let payableAmount = amountDue;
    let appliedCouponId = null;
    let discountApplied = 0;

    if (couponId) {
      const result = await validateCouponInternal({
        userId,
        couponId,
        eventType: String(eventType || "").toLowerCase(),
        price: amountDue,
      });
      if (!result.ok) {
        return res.status(400).json({ message: result.reason });
      }
      payableAmount = result.discounted;
      discountApplied = result.discount;
      appliedCouponId = couponId;
    }

    const amountMinor = toMinorUnits(payableAmount);
    const debitResult = await debitWalletForRegistration({
      userId,
      amountMinor,
      description: `${String(eventType).toUpperCase()} payment - ${event.name}`,
      metadata: { eventType, eventId: event._id },
    });

    if (!debitResult.ok) {
      return res.status(400).json({ message: debitResult.reason });
    }

    registrant.payment = {
      ...(registrant.payment || {}),
      status: "paid",
      method: "wallet",
      amountDue: payableAmount,
      amountPaid: payableAmount,
      appliedCoupon: appliedCouponId,
      discountApplied,
      paidAt: new Date(),
    };
    await event.save();

    const contact = await getUserContact({
      userId,
      role: registrant.userType || req.user?.role,
    });
    if (contact) {
      const eventDateLabel = event.startDate
        ? new Date(event.startDate).toLocaleDateString()
        : "N/A";
      await sendPaymentReceiptEmail({
        contact,
        amount: amountDue,
        currency: DEFAULT_CURRENCY,
        method: "wallet",
        reference: `WALLET-${Date.now()}`,
        contextLabel: `Registration Payment - ${event.name}`,
        extraLines: [
          { label: "Event Type", value: String(eventType).toUpperCase() },
          { label: "Event Date", value: eventDateLabel },
        ],
      });
    }

    try {
      if (appliedCouponId) {
        await markCouponAsUsed({ userId, couponId: appliedCouponId });
      }
    } catch (couponErr) {
      console.error("Failed to mark coupon used (wallet)", couponErr);
    }

    try {
      await awardPoints({
        userId,
        amount: payableAmount,
        description: `Paid ${event.name}`,
      });
    } catch (pointsErr) {
      console.error("Failed to award points for wallet payment", pointsErr);
    }

    res.json({
      message: "Registration paid using wallet.",
      discountApplied,
    });
  } catch (error) {
    console.error("Wallet registration payment error:", error);
    res.status(500).json({
      message: "Failed to pay registration using wallet",
      error: error.message,
    });
  }
};

export const stripeWebhookHandler = async (req, res) => {
  if (!ensureStripeConfigured(res)) return;
  if (!STRIPE_WEBHOOK_SECRET) {
    return res
      .status(500)
      .json({ message: "Stripe webhook secret is not configured." });
  }

  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.metadata?.intent === "wallet_topup") {
        await appendWalletCredit({
          walletId: session.metadata.walletId,
          amount: session.amount_total,
          currency: session.currency || DEFAULT_CURRENCY,
          stripeReference: session.id,
          description: "Stripe Wallet Top-Up",
        });
      } else if (session.metadata?.intent === "vendor_bazaar_payment") {
        const { bazaarId, vendorId } = session.metadata;
        await markVendorPaymentComplete({
          bazaarId,
          vendorId,
          stripeReference: session.id,
          amountPaid: session.amount_total,
        });
      } else if (session.metadata?.intent === "vendor_booth_payment") {
        const { bookingId, vendorId } = session.metadata;
        await markBoothBookingPaymentComplete({
          bookingId,
          vendorId,
          stripeReference: session.id,
          stripePaymentIntentId: session.payment_intent,
          amountPaid: session.amount_total,
        });
      } else if (session.metadata?.intent === EVENT_REGISTRATION_INTENT) {
        const { eventType, eventId, userId, couponId } = session.metadata;
        await markRegistrationPaymentComplete({
          eventType,
          eventId,
          userId,
          amountPaid: session.amount_total,
          paymentMethod: "stripe_card",
          stripeReference: session.id,
          stripePaymentIntentId: session.payment_intent,
          couponId,
        });
      }
    }
  } catch (error) {
    console.error("Stripe webhook handling error:", error);
    return res.status(500).send("Webhook handler failure");
  }

  res.json({ received: true });
};
