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

function isAvatarFolder(folder: string): boolean {
  return folder === "avatars" || folder.endsWith("/avatars");
}

function toInputBuffer(input: string | Buffer): Buffer {
  if (Buffer.isBuffer(input)) return input;
  const commaIdx = input.indexOf(",");
  const raw = commaIdx !== -1 ? input.slice(commaIdx + 1) : input;
  return Buffer.from(raw, "base64");
}

async function processImage(input: string | Buffer, folder: string): Promise<string> {
  const buf = toInputBuffer(input);

  const pipeline: sharp.Sharp = isAvatarFolder(folder)
    ? sharp(buf).resize(400, 400, { fit: "cover", withoutEnlargement: true }).webp({ quality: 85 })
    : sharp(buf).resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 82 });

  const webpBuffer = await pipeline.toBuffer();
  return `data:image/webp;base64,${webpBuffer.toString("base64")}`;
}

export async function uploadImage(
  input: string | Buffer,
  folder = "campusconnect",
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getConfig();

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const dataUri = await processImage(input, folder);

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
  });

  return result.secure_url;
}
