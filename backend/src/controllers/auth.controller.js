import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Faculty from "../models/faculty.model.js";
import Student from "../models/student.model.js";
import Admin from "../models/admin.model.js";
import dotenv from "dotenv";
import { generateToken, verifyToken } from "../lib/utils.js";
import vendor from "../models/vendor.model.js";
import { sendEmail } from "../lib/mailer.js";
import EventOffice from "../models/eventOffice.model.js";
import { type } from "os";
import multer from "multer";
import path from "path";
import fs from "fs";
dotenv.config();

// --- multer setup for vendor uploads ---
const uploadDir = path.join(process.cwd(), "uploads", "vendors");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();

const vendorUpload = multer().fields([]); // placeholder; we'll use upload() below when needed

function getMulterHandler() {
  return multer({ storage }).fields([
    { name: "taxCard", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]);
}
// --- end multer setup ---

const GMAIL_USER = process.env.EMAIL_USER; // your gmail (use App Password)
const GMAIL_PASS = process.env.EMAIL_PASS;

const PUBLIC_BASE_URL =
  (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.trim()) ||
  // fallback to your current Localtunnel URL for dev convenience:
  "https://guc-system-verify.loca.lt";

const FRONTEND_BASE_URL =
  (process.env.FRONTEND_BASE_URL && process.env.FRONTEND_BASE_URL.trim()) ||
  "http://localhost:3000";

function base(url) {
  return String(url || "").replace(/\/+$/, "");
}

function emailDomain(addr) {
  const parts = String(addr || "").split("@");
  return parts.length === 2 ? parts[1] : "gmail.com";
}

/* ========= NODEMAILER TRANSPORT ========= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER, // your gmail
    pass: GMAIL_PASS, // Gmail App Password (not regular password!)
  },
  // debug: true,
});

/* ========= EMAIL SENDER ========= */

const sendVerificationEmail = async (user, type = "student") => {
  // Build a PUBLIC HTTPS link (never localhost inside emails)
  const verifyUrl = `${base(PUBLIC_BASE_URL)}/api/auth/verify/${encodeURIComponent(
    user.verificationToken
  )}`;

  const subject = "Verify your GUC System account";
  const plain = `Hello ${user.firstName || ""},

${type === "student"
      ? "Please verify your student account to complete registration."
      : "Your staff account has been approved."
    }

Verification link:
${verifyUrl}

This link is valid for 24 hours.

If you did not register, please ignore this email.

Regards,
GUC System`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your Account</h2>
        <p style="color: #555; line-height: 1.6;">Hello ${user.firstName || ""},</p>
        <p style="color: #555; line-height: 1.6;">
          ${type === "student"
      ? "Please verify your student account to complete registration."
      : "Your staff account has been approved."
    }
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Verify Account
          </a>
        </div>
        <p style="color: #666; font-size: 13px; line-height: 1.6;">
          Or copy and paste this link:<br>
          <code style="background: #fff; padding: 8px; display: block; margin-top: 8px; word-break: break-all; border: 1px solid #ddd; border-radius: 3px;">${verifyUrl}</code>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          This link is valid for 24 hours. If you did not register, please ignore this email.
        </p>
      </div>
    </div>
  `;

  const domain = emailDomain(GMAIL_USER);
  const listUnsubMail = `unsubscribe@${domain}`;
  const listUnsubUrl = `${base(PUBLIC_BASE_URL)}/unsubscribe?email=${encodeURIComponent(
    user.email
  )}`;
  const messageId = `<${user.verificationToken}@${domain}>`;

  try {
    await transporter.sendMail({
      from: `"Hasan from GUC System" <${GMAIL_USER}>`,
      replyTo: "hasan.abulsaad@student.guc.edu.eg",
      to: user.email,
      subject,
      text: plain,
      html,
      messageId,
      headers: {
        "List-Unsubscribe": `<mailto:${listUnsubMail}>, <${listUnsubUrl}>`,
        "Feedback-ID": "verify:app:guc-system",
        "X-Mailer": "GUC System Node",
      },
      // envelope: { from: GMAIL_USER, to: user.email }, // optional alignment
    });
    console.log(`Email sent to ${user.email}`);
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
};

/* ========= CONTROLLERS ========= */

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, UniId } = req.body;

    // check email uniqueness
    let user = await Student.findOne({ email });
    if (user)
      return res.status(400).json({ message: "Email already registered" });

    user = await Faculty.findOne({ email });
    if (user)
      return res.status(400).json({ message: "Email already registered" });

    // check UniId uniqueness
    if (UniId) {
      const uniIdExistsInStudent = await Student.findOne({ UniId });
      const uniIdExistsInFaculty = await Faculty.findOne({ UniId });

      if (uniIdExistsInStudent || uniIdExistsInFaculty) {
        return res
          .status(400)
          .json({ message: "University ID already registered" });
      }
    }

    // decide role by email domain
    let role;
    if (email.endsWith("@student.guc.edu.eg")) {
      role = "Student";
    } else if (email.endsWith("@guc.edu.eg")) {
      role = "pending";
    } else {
      return res.status(400).json({ message: "Invalid email domain" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // generate token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const User = role === "Student" ? Student : Faculty;

    user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      UniId,
      role,
      verificationToken,
    });

    await user.save();

    if (role === "Student") {
      await sendVerificationEmail(user, "student");
    }

    res.json({
      message:
        "Signup successful. Students: check email. Staff: wait for admin approval.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

import { notifyNewVendorSignup } from "./notifications.controller.js";

export const vendorSignup = async (req, res) => {
  if (req.is("multipart/form-data")) {
    const upload = getMulterHandler();

    return upload(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(500).json({ message: "File upload failed" });
      }

      try {
        const { email, password, companyName } = req.body;

        // Validate required fields
        if (!email || !password || !companyName) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if vendor already exists
        const existing = await vendor.findOne({ email });
        if (existing)
          return res.status(400).json({ message: "Email already registered" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Access uploaded files from memory
        const taxCardFile = req.files?.taxCard?.[0];
        const logoFile = req.files?.logo?.[0];

        // Create new vendor document including binary file data
        const newVendor = new vendor({
          companyName,
          email,
          password: hashedPassword,
          ...(taxCardFile
            ? {
              taxCard: {
                data: taxCardFile.buffer,
                contentType: taxCardFile.mimetype,
              },
            }
            : {}),
          ...(logoFile
            ? {
              logo: {
                data: logoFile.buffer,
                contentType: logoFile.mimetype,
              },
            }
            : {}),
        });

        // Save to MongoDB
        await newVendor.save();

        // Notify EventOffice and Admin
        try {
          const notificationReq = {
            user: { _id: newVendor._id, role: "Vendor" }, // Mock user context
            body: {
              title: `New vendor registration: ${companyName}`,
              message: `${companyName} has registered as a new vendor.`,
              data: {
                vendorId: newVendor._id,
                vendorName: companyName,
              },
            },
          };
          const notificationRes = {
            status: () => ({ json: () => { } }),
            json: () => { },
          };
          await notifyNewVendorSignup(notificationReq, notificationRes);
          console.log(`[Vendor Signup] Notification sent for ${companyName}`);
        } catch (notifErr) {
          console.error("Failed to send vendor signup notification:", notifErr);
        }

        return res.json({ message: "Vendor signup successful" });
      } catch (err) {
        console.error("vendorSignup error:", err);
        return res
          .status(500)
          .json({ message: "Server error: " + err.message });
      }
    });
  }

  // Handle JSON requests (no files)
  try {
    const { email, password, companyName } = req.body;

    if (!email || !password || !companyName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await vendor.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newVendor = new vendor({
      companyName,
      email,
      password: hashedPassword,
    });

    await newVendor.save();

    // Notify EventOffice and Admin
    try {
      const notificationReq = {
        user: { _id: newVendor._id, role: "Vendor" }, // Mock user context
        body: {
          title: `New vendor registration: ${companyName}`,
          message: `${companyName} has registered as a new vendor.`,
          data: {
            vendorId: newVendor._id,
            vendorName: companyName,
          },
        },
      };
      const notificationRes = {
        status: () => ({ json: () => { } }),
        json: () => { },
      };
      await notifyNewVendorSignup(notificationReq, notificationRes);
      console.log(`[Vendor Signup] Notification sent for ${companyName}`);
    } catch (notifErr) {
      console.error("Failed to send vendor signup notification:", notifErr);
    }

    res.json({ message: "Vendor signup successful (no files uploaded)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// --- ADMIN-only vendor document verification endpoints ---

// List vendors that need document review (Admin only)
export const listVendorsForReview = async (req, res) => {
  try {
    // allow Admin and Event Office to review vendor documents
    if (!req.user || !["Admin", "Event Office"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin or Event Office only" });
    }

    const vendorsToReview = await vendor
      .find({
        $or: [
          {
            "taxCard.data": { $exists: true },
            $or: [
              { taxCardStatus: "pending" },
              { taxCardStatus: { $exists: false } },
            ],
          },
          {
            "logo.data": { $exists: true },
            $or: [
              { logoStatus: "pending" },
              { logoStatus: { $exists: false } },
            ],
          },
        ],
      })
      .select("_id companyName email taxCardStatus logoStatus status")
      .lean();

    return res.json({ vendors: vendorsToReview });
  } catch (err) {
    console.error("listVendorsForReview error:", err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const reviewVendorDocument = async (req, res) => {
  try {
    // allow Admin and Event Office to approve/reject vendor documents
    if (!req.user || !["Admin", "Event Office"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin or Event Office only" });
    }

    const vendorId = req.params.id;
    const { doc, action, note } = req.body;

    if (!["taxCard", "logo"].includes(doc)) {
      return res.status(400).json({ message: "Invalid document type" });
    }
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const v = await vendor.findById(vendorId);
    if (!v) return res.status(404).json({ message: "Vendor not found" });

    const statusValue = action === "accept" ? "accepted" : "rejected";

    if (doc === "taxCard") {
      if (!v.taxCard || !v.taxCard.data) {
        return res
          .status(400)
          .json({ message: "Vendor has no tax card uploaded" });
      }
      v.taxCardStatus = statusValue;
      if (note) v.taxCardReviewNote = note;
    } else {
      if (!v.logo || !v.logo.data) {
        return res.status(400).json({ message: "Vendor has no logo uploaded" });
      }
      v.logoStatus = statusValue;
      if (note) v.logoReviewNote = note;
    }

    const taxOk = v.taxCardStatus === "accepted" || !v.taxCard;
    const logoOk = v.logoStatus === "accepted" || !v.logo;
    if (taxOk && logoOk) {
      v.status = "approved";
    } else if (v.taxCardStatus === "rejected" || v.logoStatus === "rejected") {
      v.status = "documents_rejected";
    } else {
      v.status = "pending";
    }

    await v.save();

    return res.json({
      message: "Review updated",
      vendorId: v._id,
      taxCardStatus: v.taxCardStatus,
      logoStatus: v.logoStatus,
      status: v.status,
    });
  } catch (err) {
    console.error("reviewVendorDocument error:", err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const approveVendorAccount = async (req, res) => {
  try {
    if (!req.user || !["Admin", "Event Office"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const { action = "accept" } = req.body || {};
    const normalizedAction = String(action).trim().toLowerCase();
    const statusMap = {
      accept: "accepted",
      approved: "accepted",
      reject: "rejected",
      rejected: "rejected",
      pending: "pending",
    };

    const nextStatus = statusMap[normalizedAction];
    if (!nextStatus) {
      return res.status(400).json({ message: "Invalid action provided" });
    }

    const vendorDoc = await vendor.findById(id);
    if (!vendorDoc) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (vendorDoc.status === "blocked") {
      return res
        .status(400)
        .json({ message: "Vendor is blocked and cannot be updated" });
    }

    if (vendorDoc.status === nextStatus) {
      return res.json({ message: `Vendor already marked as ${nextStatus}` });
    }

    vendorDoc.status = nextStatus;
    vendorDoc.approvedAt = nextStatus === "accepted" ? new Date() : null;
    await vendorDoc.save();

    let subject;
    let text;
    if (nextStatus === "accepted") {
      subject = "Your vendor account has been approved";
      text = `Hello ${vendorDoc.companyName || "Vendor"},

Great news! Your vendor account on the GUC events platform has been approved. You can now log in with your registered email to manage booths, bookings, and upcoming events.

If you have any questions, feel free to reach out to the Event Office.

Regards,
GUC Events Platform Team`;
    } else if (nextStatus === "rejected") {
      subject = "Your vendor application status";
      text = `Hello ${vendorDoc.companyName || "Vendor"},

We reviewed your vendor application for the GUC events platform and, unfortunately, it has been rejected for now. You can reply to this email if you need clarification or would like to provide additional information.

Regards,
GUC Events Platform Team`;
    }

    if (subject && text) {
      await sendEmail({
        to: vendorDoc.email,
        subject,
        text,
      });
    }

    return res.json({
      message:
        nextStatus === "accepted"
          ? "Vendor account approved"
          : nextStatus === "rejected"
            ? "Vendor application rejected"
            : "Vendor marked as pending",
    });
  } catch (err) {
    console.error("approveVendorAccount error:", err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

// VERIFY
export const verify = async (req, res) => {
  try {
    let user = await Student.findOne({ verificationToken: req.params.token });
    if (!user) {
      user = await Faculty.findOne({ verificationToken: req.params.token });
      if (!user) return res.status(400).send("Invalid token");
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.redirect("http://localhost:3000/auth");
  } catch (err) {
    res.status(500).send("Server error" + err.message);
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Student.findOne({ email });
    let role = "Student";

    if (!user) {
      user = await Faculty.findOne({ email });
      if (user) {
        role = user.role;
      }
    }
    if (!user) {
      user = await Admin.findOne({ email });
      role = "Admin";
    }
    if (!user) {
      user = await EventOffice.findOne({ email });
      role = "Event Office";
    }
    if (!user) {
      user = await vendor.findOne({ email });
      role = "Vendor";
    }
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check if user is blocked
    if (user.status === "blocked") {
      return res.status(403).json({
        message:
          "You can't log in as you are blocked. For inquiries contact this email: admin@gmail.com",
        isBlocked: true,
      });
    }

    if (role === "Vendor") {
      const approvedStatuses = ["accepted", "active"];
      if (!approvedStatuses.includes(user.status)) {
        const responseMessage =
          user.status === "rejected"
            ? "Your vendor application was rejected. Please contact the Event Office for more details."
            : "Your vendor account is awaiting approval. You will be notified via email once it is activated.";
        return res.status(403).json({ message: responseMessage });
      }
    }

    // Check verification for non-admin users
    if (role != "Admin" && role != "Event Office" && role != "Vendor") {
      if (!user.isVerified)
        return res
          .status(403)
          .json({ message: "Account is yet to be verified" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken({ id: user._id, role: role });

    user = publicUser(user, role);

    res.json({ token, role, user });
  } catch (err) {
    res.status(500).json({ message: "Server error" + err.message });
  }
};

function publicUser(userDoc, role) {
  let username = userDoc.firstName;
  if (role === "Admin" || role === "Event Office") {
    username = userDoc.name;
  }
  if (role === "Vendor") {
    username = userDoc.companyName;
  }
  return {
    id: userDoc._id?.toString(),
    email: userDoc.email,
    role: role,
    name: username,
    ...(userDoc.UniId ? { UniId: userDoc.UniId } : {}),
  };
}

export const me = async (req, res) => {
  try {
    const { id, role } = req.user || {};

    if (!id) return res.status(401).json({ message: "Unauthorized" });

    const fetchById = (Model) =>
      Model.findById(id).select("-password -passwordHash -__v").lean();

    let userDoc = null;
    let resolvedRole = role;

    if (!userDoc) {
      userDoc = await fetchById(Student);
      if (userDoc) resolvedRole = "Student";
    }
    if (!userDoc) {
      userDoc = await fetchById(Faculty);
      if (userDoc) resolvedRole = userDoc.role || "Faculty";
    }
    if (!userDoc) {
      userDoc = await fetchById(Admin);
      if (userDoc) resolvedRole = "Admin";
    }
    if (!userDoc) {
      userDoc = await fetchById(EventOffice);
      if (userDoc) resolvedRole = "Event Office";
    }
    if (!userDoc) {
      userDoc = await fetchById(vendor);
      if (userDoc) resolvedRole = "Vendor";
    }

    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: publicUser(userDoc, resolvedRole) });
  } catch (err) {
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

// approve staff/ta/prof
export const approveUser = async (req, res) => {
  try {
    const { role } = req.body; // expected: "ta" | "prof" | "staff"
    const user = await Faculty.findById(req.params.id);

    if (!user || user.role !== "pending") {
      return res.status(404).json({ message: "User not found or not pending" });
    }

    user.role = role;
    await user.save();

    await sendVerificationEmail(user);

    res.json({
      message: `User approved as ${role} and verification email sent.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await Admin.findOne({ email });
    if (user)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new Admin({ name, email, password: hashedPassword });

    await user.save();

    res.json({
      message: "Admin created successfully",
      admin: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};

export const createEventOffice = async (req, res) => {
  try {
    const { name, email, password, status } = req.body;

    let existing = await EventOffice.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    // Accept plaintext or already-hashed bcrypt passwords
    let finalPassword = password;
    const looksHashed =
      typeof password === "string" &&
      password.startsWith("$2") &&
      password.length >= 50;
    if (!looksHashed) {
      finalPassword = await bcrypt.hash(password, 10);
    }

    const user = new EventOffice({
      name,
      email,
      password: finalPassword,
      ...(status ? { status } : {}),
    });

    await user.save();

    res.json({
      message: "EventOffice created successfully",
      eventOffice: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    // Mongoose validation errors
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params; // id from URL

    const deletedAdmin = await Admin.findByIdAndDelete(id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("Delete admin error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const deleteEventOffice = async (req, res) => {
  try {
    const { id } = req.params; // id from URL

    const deletedAdmin = await EventOffice.findByIdAndDelete(id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: "Event office not found" });
    }

    res.status(200).json({ message: "Event office deleted successfully" });
  } catch (err) {
    console.error("Delete admin error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// GET: aggregate users with their status
export const getUsersStatus = async (req, res) => {
  try {
    const [students, faculty, eventOffices, vendorsRaw] = await Promise.all([
      Student.find(
        {},
        "firstName lastName email status UniId isVerified"
      ).lean(),
      Faculty.find(
        {},
        "firstName lastName email status UniId role isVerified"
      ).lean(),
      EventOffice.find({}, "name email status").lean(),
      vendor
        .find(
          {},
          "companyName email status taxCardStatus logoStatus createdAt updatedAt approvedAt logo taxCard"
        )
        .select("-logo.data -taxCard.data")
        .lean(),
    ]);

    const studentsWithRole = students.map((s) => ({ ...s, role: "Student" }));
    const eventOfficesWithRole = eventOffices.map((e) => ({
      ...e,
      role: "Event Office",
    }));

    const vendorsWithRole = vendorsRaw.map((v) => {
      const hasTaxCard = !!(
        v?.taxCard &&
        (v.taxCard.contentType ||
          v.taxCard.filename ||
          v.taxCard.path ||
          (Array.isArray(v.taxCard.data) && v.taxCard.data.length))
      );
      const hasLogo = !!(
        v?.logo &&
        (v.logo.contentType ||
          v.logo.filename ||
          v.logo.path ||
          (Array.isArray(v.logo.data) && v.logo.data.length))
      );
      const isVerified =
        String(v.status || "").toLowerCase() === "accepted";

      return {
        _id: v._id,
        companyName: v.companyName,
        email: v.email,
        role: "Vendor",
        status: v.status,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        taxCardStatus: v.taxCardStatus ?? (hasTaxCard ? "pending" : "—"),
        logoStatus: v.logoStatus ?? (hasLogo ? "pending" : "—"),
        hasTaxCard,
        hasLogo,
        isVerified,
      };
    });

    return res.status(200).json({
      students: studentsWithRole,
      faculty,
      eventOffices: eventOfficesWithRole,
      vendors: vendorsWithRole,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getAdminsEvent = async (req, res) => {
  try {
    const [admins, eventOffices] = await Promise.all([
      Admin.find({}, "name email"),
      EventOffice.find({}, "name email"),
    ]);
    return res.status(200).json({
      admins,
      eventOffices,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await Faculty.find({ role: "pending" }).select(
      "-password -verificationToken -__v"
    );
    return res.status(200).json({ pendingUsers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getUserRegistrations = async (req, res) => {
  try {
    const { uniId } = req.query;
    let userId = req.user.id;
    let userRole = req.user.role;

    // If a UniId is provided, resolve user by UniId (Student or Faculty)
    if (uniId) {
      const [student, faculty] = await Promise.all([
        (await import("../models/student.model.js")).default
          .findOne({ UniId: uniId })
          .select("_id role")
          .lean(),
        (await import("../models/faculty.model.js")).default
          .findOne({ UniId: uniId })
          .select("_id role")
          .lean(),
      ]);
      const resolved = student || faculty;
      if (!resolved) {
        return res
          .status(404)
          .json({ message: "No user found with provided UniId" });
      }
      userId = resolved._id.toString();
      userRole = resolved.role || (student ? "Student" : "Faculty");
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Import models
    const Workshop = (await import("../models/workshop.model.js")).default;
    const Trip = (await import("../models/trip.model.js")).default;

    // Find workshops where user is registered
    const workshops = await Workshop.find({
      "registrants.user": objectId,
    }).select(
      "name location startDate endDate startTime endTime professors capacity registrants priceToAttend"
    );

    // Find trips where user is registered
    const trips = await Trip.find({
      "registrants.user": objectId,
    }).select(
      "name location startDate endDate startTime endTime price capacity registrants"
    );

    // Transform the data
    const userRegistrations = [];

    workshops.forEach((workshop) => {
      const userRegistration = workshop.registrants.find(
        (reg) => reg.user.toString() === userId.toString()
      );
      if (userRegistration) {
        userRegistrations.push({
          ...workshop.toObject(),
          eventType: "Workshop",
          registeredAt: userRegistration.registeredAt,
          userType: userRegistration.userType,
          payment: userRegistration.payment || {},
        });
      }
    });

    trips.forEach((trip) => {
      const userRegistration = trip.registrants.find(
        (reg) => reg.user.toString() === userId.toString()
      );
      if (userRegistration) {
        userRegistrations.push({
          ...trip.toObject(),
          eventType: "Trip",
          registeredAt: userRegistration.registeredAt,
          userType: userRegistration.userType,
          payment: userRegistration.payment || {},
        });
      }
    });

    // Sort by registration date (most recent first)
    userRegistrations.sort(
      (a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)
    );

    res.json({ registrations: userRegistrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getVendorLogo = async (req, res) => {
  const vendorData = await vendor.findById(req.params.id);
  if (!vendorData || !vendorData.logo || !vendorData.logo.data)
    return res.status(404).send("Logo not found");

  res.set("Content-Type", vendorData.logo.contentType);
  res.send(vendorData.logo.data);
};

export const getVendorTaxCard = async (req, res) => {
  const vendorData = await vendor.findById(req.params.id);
  if (!vendorData || !vendorData.taxCard || !vendorData.taxCard.data)
    return res.status(404).send("Tax card not found");

  res.set("Content-Type", vendorData.taxCard.contentType);
  res.send(vendorData.taxCard.data);
};
