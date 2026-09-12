import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, "No file uploaded");

  const { folder = "chatapp/files", resourceType = "auto" } = req.body;
  const result = await uploadToCloudinary(req.file.buffer, folder, resourceType);

  return sendSuccess(res, 200, "File uploaded", {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format,
    resource_type: result.resource_type,
    originalName: req.file.originalname,
  });
});