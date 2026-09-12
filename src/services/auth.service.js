import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
} from "../utils/generateToken.js";
import { sendEmail } from "../config/nodemailer.js";
import crypto from "crypto";

export const registerUser = async ({ username, fullName, email, password }) => {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    if (existing.email === email) throw new Error("Email already registered");
    throw new Error("Username already taken");
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

  const user = await User.create({
    username,
    fullName,
    email,
    password,
    otp,
    otpExpires,
    isVerified: false,
  });

  // Send OTP email
  try {
    await sendEmail({
      to: email,
      subject: "Verify your ChatApp account",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h2 style="color:#4F46E5;">Welcome to ChatApp, ${fullName}!</h2>
          <p>Your OTP for email verification is:</p>
          <h1 style="letter-spacing:6px;color:#4F46E5;background:#f3f4f6;padding:12px;text-align:center;border-radius:8px;">${otp}</h1>
          <p>This OTP is valid for ${process.env.OTP_EXPIRES_IN || 10} minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("OTP email failed:", err.message);
  }

  return { userId: user._id, email: user.email };
};

export const verifyOTP = async (email, otp) => {
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (!user) throw new Error("User not found");
  if (user.isVerified) throw new Error("Email already verified");
  if (!user.otp || user.otp !== otp) throw new Error("Invalid OTP");
  if (user.otpExpires < Date.now()) throw new Error("OTP expired");

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  return user;
};

export const resendOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");
  if (user.isVerified) throw new Error("Email already verified");

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email,
    subject: "Your new OTP",
    html: `<h2>Your new OTP is: <b>${otp}</b></h2>`,
  });

  return true;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new Error("Invalid email or password");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error("Invalid email or password");

  if (!user.isVerified) {
    const error = new Error("Please verify your email first before logging in.");
    error.statusCode = 403;
    error.isUnverified = true;
    error.email = user.email;
    throw error;
  }

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  return { user, accessToken, refreshToken };
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("No account with that email");

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. Valid for 15 minutes.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a>
        <p>Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });

  return true;
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) throw new Error("Invalid or expired token");

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return user;
};