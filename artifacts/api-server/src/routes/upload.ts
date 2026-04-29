import { Router } from "express";
import { authMiddleware } from "../lib/auth";
import { uploadImage, isCloudinaryConfigured } from "../lib/cloudinary";

const router = Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({
        error: "ServiceUnavailable",
        message: "Image CDN is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      });
      return;
    }

    const { base64, folder } = req.body as { base64?: string; folder?: string };

    if (!base64 || typeof base64 !== "string") {
      res.status(400).json({ error: "ValidationError", message: "base64 image data is required" });
      return;
    }

    if (!base64.startsWith("data:image/")) {
      res.status(400).json({ error: "ValidationError", message: "base64 must be a data URI (data:image/...)" });
      return;
    }

    const url = await uploadImage(base64, folder || "campusconnect");
    res.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload image";
    console.error("[upload]", message);
    res.status(500).json({ error: "ServerError", message });
  }
});

export default router;
