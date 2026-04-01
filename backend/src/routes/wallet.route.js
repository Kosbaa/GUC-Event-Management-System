import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  getCurrentUserWallet,
  openWalletForCurrentUser,
  resetWallet,
} from "../controllers/wallet.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/open", openWalletForCurrentUser);
router.get("/me", getCurrentUserWallet);
router.post("/reset", resetWallet);

export default router;
