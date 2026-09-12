import { validationResult } from "express-validator";
import { sendError } from "../utils/response.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(
      res,
      400,
      "Validation failed",
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};