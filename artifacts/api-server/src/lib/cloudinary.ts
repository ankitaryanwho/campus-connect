import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

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

async function toBuffer(base64DataUri: string): Promise<Buffer> {
  const commaIdx = base64DataUri.indexOf(",");
  const raw = commaIdx !== -1 ? base64DataUri.slice(commaIdx + 1) : base64DataUri;
  return Buffer.from(raw, "base64");
}

async function processImage(base64DataUri: string, folder: string): Promise<string> {
  const input = await toBuffer(base64DataUri);

  let pipeline: sharp.Sharp;
  if (folder === "avatars") {
    pipeline = sharp(input).resize(400, 400, { fit: "cover", withoutEnlargement: true }).webp({ quality: 85 });
  } else {
    pipeline = sharp(input).resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 82 });
  }

  const webpBuffer = await pipeline.toBuffer();
  return `data:image/webp;base64,${webpBuffer.toString("base64")}`;
}

export async function uploadImage(
  base64DataUri: string,
  folder = "campusconnect",
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getConfig();

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  let dataUri = base64DataUri;
  try {
    dataUri = await processImage(base64DataUri, folder);
  } catch (err) {
    console.warn("[cloudinary] sharp processing failed, uploading original:", err);
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
  });

  return result.secure_url;
}
