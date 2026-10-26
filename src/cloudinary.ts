import "dotenv/config";
import fs from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
import logger from "./logger.ts";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(filePath: string) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "announcements",
    });
    logger.info({ url: result.secure_url }, "Image uploaded to Cloudinary");
    return result.secure_url;
  } finally {
    // Never keep local copies, even if the upload failed
    await fs.unlink(filePath).catch(() => {});
  }
}
