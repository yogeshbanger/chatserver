import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
} from "../utils/generateToken.js";
import { sendEmail, resendemail, sendResetPasswordEmail } from "../config/nodemailer.js";
import crypto from "crypto";

export const registerUser = async ({ username, fullName, email, password }) => {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    if (existing.email === email) throw new Error("Email already registered");
    throw new Error("Username already taken");
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);
  sendEmail({ fullName, otp, email });

  const user = await User.create({
    username,
    fullName,
    email,
    password,
    otp,
    otpExpires,
    isVerified: false,
  });


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

  await resendemail({fullName:user.fullName, otp,email: user.email});

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

  await sendResetPasswordEmail({
    fullName: user.fullName,
    resetUrl,
    email: user.email,
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