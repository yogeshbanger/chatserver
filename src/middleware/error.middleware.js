import { sendError } from "../utils/response.js";

export const notFound = (req, res, next) => {
  sendError(res, 404, `Not Found - ${req.originalUrl}`);
};

export const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || "Server Error";

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  return res.status(statusCode).json({
    success: false,
    message,
    isUnverified: err.isUnverified || false,
    email: err.email || null,
  });
};