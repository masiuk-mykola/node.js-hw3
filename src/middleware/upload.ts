import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(createError(400, "Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Removes the temp file if the request ends before it reaches Cloudinary
// (e.g. validation failed). Errors are ignored because it may be gone already.
function cleanupOnFinish(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (req.file) {
      fs.unlink(req.file.path).catch(() => {});
    }
  });
  next();
}

export const uploadImage = [cleanupOnFinish, upload.single("image")];
