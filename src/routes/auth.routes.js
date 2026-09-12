import express from "express";
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
} from "../controllers/auth.controller.js";
import {
  registerValidator,
  loginValidator,
  otpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../validators/auth.validator.js";
import { validate } from "../middleware/validation.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerValidator, validate, register);
router.post("/verify-otp", otpValidator, validate, verifyOTP);
router.post("/resend-otp", forgotPasswordValidator, validate, resendOTP);
router.post("/login", loginValidator, validate, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);
router.post("/refresh", refreshToken);

export default router;