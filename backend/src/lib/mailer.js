import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const { EMAIL_USER, EMAIL_PASS } = process.env;

let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn(
    "[mailer] EMAIL_USER or EMAIL_PASS is missing. Email notifications are disabled."
  );
}

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
  headers,
  attachments,
}) => {
  if (!transporter) {
    return;
  }

  try {
    await transporter.sendMail({
      from: `"GUC Events" <${EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
      replyTo,
      headers,
      ...(attachments ? { attachments } : {}),
    });
  } catch (err) {
    console.error("[mailer] Failed to send email:", err.message);
  }
};

