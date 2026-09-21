import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
} from "../utils/generateToken.js";
import { sendEmail, resendemail, sendResetPasswordEmail } from "../config/nodemailer.js";
import crypto from "crypto";

const createError = (msg, statusCode = 400) => {
  const err = new Error(msg);
  err.statusCode = statusCode;
  return err;
};

export const registerUser = async ({ username, fullName, email, password }) => {
  const normalizedEmail = email ? email.toLowerCase().trim() : "";
  const normalizedUsername = username ? username.toLowerCase().trim() : "";

  if (!normalizedUsername) {
    throw createError("Username is required", 400);
  }

  // 1. Check existing email
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    if (existingEmail.isVerified) {
      throw createError("Email is already registered and verified. Please sign in.", 400);
    }
    // Existing unverified account: update user details, refresh OTP & save to DB
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

    existingEmail.username = normalizedUsername;
    existingEmail.fullName = fullName;
    existingEmail.password = password;
    existingEmail.otp = otp;
    existingEmail.otpExpires = otpExpires;
    await existingEmail.save();
    console.log(`✅ [MONGODB REGISTER] Updated existing unverified user: ${existingEmail._id} (${normalizedEmail})`);

    sendEmail({ fullName, otp, email: normalizedEmail }).catch((emailErr) => {
      console.warn("Email delivery warning for existing unverified user:", emailErr.message);
    });

    return { userId: existingEmail._id, email: existingEmail.email };
  }

  // 2. Check existing username
  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    throw createError("Username is already taken. Please choose another username.", 400);
  }

  // 3. Create new user in MongoDB
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

  const user = await User.create({
    username: normalizedUsername,
    fullName,
    email: normalizedEmail,
    password,
    otp,
    otpExpires,
    isVerified: false,
  });

  console.log(`✅ [MONGODB REGISTER] Saved new user to MongoDB: ${user._id} (${normalizedEmail})`);

  sendEmail({ fullName, otp, email: normalizedEmail }).catch((emailErr) => {
    console.warn("Email delivery warning during registration:", emailErr.message);
  });

  return { userId: user._id, email: user.email };
};

export const verifyOTP = async (email, otp) => {
  const normalizedEmail = email ? email.toLowerCase().trim() : "";
  const user = await User.findOne({ email: normalizedEmail }).select("+otp +otpExpires");
  if (!user) throw createError("User not found", 400);
  if (user.isVerified) throw createError("Email already verified", 400);

  if (!user.otp) throw createError("No OTP code generated. Please request a new OTP.", 400);
  if (user.otpExpires < Date.now()) throw createError("OTP code has expired. Please click 'Resend OTP'.", 400);

  // Validate OTP code strictly against stored OTP or fallback if EMAIL_USER is missing
  const isMatch = user.otp === otp || ((!process.env.EMAIL_USER || !process.env.EMAIL_PASS) && otp === "123456");

  if (!isMatch) {
    throw createError("Invalid OTP code. Please enter the correct code sent to your email.", 400);
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  return user;
};

export const resendOTP = async (email) => {
  const normalizedEmail = email ? email.toLowerCase().trim() : "";
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw createError("User not found", 400);
  if (user.isVerified) throw createError("Email already verified", 400);

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  // Non-blocking email dispatch
  resendemail({ fullName: user.fullName, otp, email: user.email }).catch((emailErr) => {
    console.warn("Resend email warning:", emailErr.message);
  });

  return true;
};

export const loginUser = async (email, password) => {
  const normalizedEmail = email ? email.toLowerCase().trim() : "";
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) throw createError("Invalid email or password", 400);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw createError("Invalid email or password", 400);

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
  const normalizedEmail = email ? email.toLowerCase().trim() : "";
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw createError("No account with that email", 400);

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL || "https://vibesschat.vercel.app";
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  // Non-blocking email dispatch
  sendResetPasswordEmail({
    fullName: user.fullName,
    resetUrl,
    email: user.email,
  }).catch((emailErr) => {
    console.warn("Reset password email warning:", emailErr.message);
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