import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import User from "../models/User.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export const register = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;
  const result = await authService.registerUser({
    username,
    fullName,
    email,
    password,
  });
  return sendSuccess(res, 201, "Registered. Check email for OTP.", result);
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await authService.verifyOTP(email, otp);
  const accessToken = (await import("../utils/generateToken.js")).generateAccessToken(user._id);
  const refreshToken = (await import("../utils/generateToken.js")).generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, cookieOptions);
  return sendSuccess(res, 200, "Email verified successfully", {
    user,
    accessToken,
  });
});

export const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.resendOTP(email);
  return sendSuccess(res, 200, "OTP resent");
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

  res.cookie("refreshToken", refreshToken, cookieOptions);
  return sendSuccess(res, 200, "Login successful", { user, accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.isOnline = false;
    req.user.lastSeen = new Date();
    await req.user.save({ validateBeforeSave: false });
  }
  res.clearCookie("refreshToken");
  return sendSuccess(res, 200, "Logged out");
});

export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "User fetched", req.user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  return sendSuccess(res, 200, "Password reset email sent");
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await authService.resetPassword(token, password);
  return sendSuccess(res, 200, "Password reset successful", { user });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: "No refresh token" });

  const { verifyRefreshToken, generateAccessToken } = await import("../utils/generateToken.js");
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  const accessToken = generateAccessToken(user._id);
  return sendSuccess(res, 200, "Token refreshed", { accessToken });
});