import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|mov|mp3|wav/;
  const ext = allowed.test(file.originalname.toLowerCase().split(".").pop());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) return cb(null, true);
  cb(new Error("Unsupported file type"));
};

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter,
});