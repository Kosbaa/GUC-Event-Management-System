import { Router } from "express";
import {
  createTestCheckoutSession,
  createWalletTopUpSession,
  createVendorBazaarPaymentSession,
  createVendorBoothPaymentSession,
  confirmWalletTopUp,
  confirmVendorBazaarPayment,
  createRegistrationPaymentSession,
  confirmRegistrationPayment,
  payRegistrationWithWallet,
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/test-checkout", authMiddleware, createTestCheckoutSession);
router.post("/wallet-topup-session", authMiddleware, createWalletTopUpSession);
router.post("/wallet-topup-confirm", authMiddleware, confirmWalletTopUp);
router.post(
  "/vendor-bazaar/:bazaarId/:vendorId/session",
  authMiddleware,
  createVendorBazaarPaymentSession
);
router.post(
  "/vendor-booth/:bookingId/session",
  authMiddleware,
  createVendorBoothPaymentSession
);
router.post(
  "/vendor-bazaar/confirm",
  authMiddleware,
  confirmVendorBazaarPayment
);
router.post(
  "/registrations/:eventType/:eventId/session",
  authMiddleware,
  createRegistrationPaymentSession
);
router.post(
  "/registrations/:eventType/:eventId/pay-with-wallet",
  authMiddleware,
  payRegistrationWithWallet
);
router.post(
  "/registrations/confirm",
  authMiddleware,
  confirmRegistrationPayment
);

export default router;
