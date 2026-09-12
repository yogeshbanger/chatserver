import { verifyAccessToken } from "../utils/generateToken.js";
import User from "../models/User.js";
import { sendError } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return sendError(res, 401, "Not authorized, no token");
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return sendError(res, 401, "User no longer exists");
    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, "Not authorized, token failed");
  }
});