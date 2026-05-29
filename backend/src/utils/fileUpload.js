import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param {string} localFilePath
 * @param {"image" | "video"} type
 */
const uploadOnCloudinary = async (localFilePath, type = "image") => {
  try {
    if (!localFilePath) return null;

    const options =
      type === "video"
        ? {
            resource_type: "video",
            format: "mp4",          // 🔥 CRITICAL
          }
        : {
            resource_type: "image",
          };

    const result = await cloudinary.uploader.upload(
      localFilePath,
      options
    );

    fs.unlinkSync(localFilePath);

    // 🔑 RETURN ONLY WHAT FRONTEND NEEDS
    return {
      url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration || null,
    };
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export { uploadOnCloudinary };