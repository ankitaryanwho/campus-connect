import { v2 as cloudinary } from "cloudinary";

function getConfig() {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey    = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env["CLOUDINARY_CLOUD_NAME"] &&
    process.env["CLOUDINARY_API_KEY"] &&
    process.env["CLOUDINARY_API_SECRET"],
  );
}

export async function uploadImage(
  base64DataUri: string,
  folder = "campusconnect",
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getConfig();

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return result.secure_url;
}
