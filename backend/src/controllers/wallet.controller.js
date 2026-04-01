import mongoose from "mongoose";
import Wallet from "../models/wallet.model.js";
import Student from "../models/student.model.js";
import Faculty from "../models/faculty.model.js";
import Admin from "../models/admin.model.js";
import EventOffice from "../models/eventOffice.model.js";
import Vendor from "../models/vendor.model.js";

const roleModelMap = {
  Student: Student,
  Staff: Faculty,
  TA: Faculty,
  Professor: Faculty,
  Faculty: Faculty,
  Admin: Admin,
  "Event Office": EventOffice,
  Vendor: Vendor,
};

const findUserDocument = async (userId, role) => {
  const Model = roleModelMap[role];
  if (!Model) return null;
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return Model.findById(userId).select("_id");
};

export const openWalletForCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res
        .status(400)
        .json({ message: "Authenticated user information is missing." });
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      return res.status(200).json({
        wallet,
        message: "Wallet already exists for this user.",
      });
    }

    const userDoc = await findUserDocument(userId, role);
    if (!userDoc) {
      return res.status(404).json({
        message: `Unable to open wallet. User with role "${role}" not found.`,
      });
    }

    wallet = await Wallet.create({
      user: userDoc._id,
      userRole: role,
      history: [
        {
          type: "init",
          amount: 0,
          currency: "usd",
          description: "Wallet opened",
        },
      ],
    });

    return res
      .status(201)
      .json({ wallet, message: "Wallet created successfully." });
  } catch (error) {
    console.error("Wallet creation error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create wallet", error: error.message });
  }
};

export const getCurrentUserWallet = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(400)
        .json({ message: "Authenticated user information is missing." });
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({
        message: "No wallet exists for this user yet.",
      });
    }

    return res.json({ wallet });
  } catch (error) {
    console.error("Fetch wallet error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch wallet", error: error.message });
  }
};

export const resetWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return res
        .status(404)
        .json({ message: "No wallet exists to reset for this user." });
    }

    wallet.balance = 0;
    wallet.history = [
      {
        type: "init",
        amount: 0,
        currency: wallet.currency,
        description: "Wallet reset",
      },
    ];
    wallet.lastTransactionAt = new Date();
    await wallet.save();

    return res.json({
      wallet,
      message: "Wallet has been reset. You can top up again anytime.",
    });
  } catch (error) {
    console.error("Reset wallet error:", error);
    return res
      .status(500)
      .json({ message: "Failed to reset wallet", error: error.message });
  }
};
