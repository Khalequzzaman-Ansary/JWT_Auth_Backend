const { randomInt, createHash } = require("crypto");

const OTP_TTL_MS = 2 * 60 * 1000;

const normaliconst express = require("express");
zeEmail = (email) => email.trim().toLowerCase();

const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

const hashOtp = (otp) =>
  createHash("sha256")
    .update(`${otp}:${process.env.OTP_PEPPER || "dev-pepper"}`)
    .digest("hex");

// Replace this with real email sending (Nodemailer / Brevo / Resend / SES)
async function sendOtpEmail(email, otp) {
  console.log(`[OTP DEV] ${email} -> ${otp}`);
}

async function purgeExpiredUnverifiedUserByEmail(email) {
  await prisma.user.deleteMany({
    where: {
      email,
      isVerified: false,
      otpExpiresAt: { lt: new Date() },
    },
  });
}
