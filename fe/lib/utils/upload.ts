import * as fs from "fs/promises";
import * as path from "path";
import { APP_CONFIG } from "@/lib/config";

interface SaveBase64Options {
  base64Str: string;
  allowedMimeTypes: string[];
  maxSizeMb?: number;
  fileNamePrefix: string;
  originalFileName?: string;
}

export async function saveBase64File({
  base64Str,
  allowedMimeTypes,
  maxSizeMb = APP_CONFIG.MAX_VIDEO_UPLOAD_MB,
  fileNamePrefix,
  originalFileName,
}: SaveBase64Options): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    let mimeType = "application/octet-stream";
    let cleanBase64 = base64Str;

    // Check if it's a data URL (e.g. data:image/jpeg;base64,...)
    const mimeMatch = base64Str.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
      const dataParts = base64Str.split(";base64,");
      if (dataParts.length === 2) {
        cleanBase64 = dataParts[1];
      }
    } else {
      // Fallback: see if we can infer from the original file name or standard MIME
      if (originalFileName) {
        const ext = path.extname(originalFileName).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        else if (ext === ".png") mimeType = "image/png";
        else if (ext === ".webp") mimeType = "image/webp";
        else if (ext === ".mp4") mimeType = "video/mp4";
        else if (ext === ".mov") mimeType = "video/quicktime";
      }
    }

    if (!allowedMimeTypes.includes(mimeType)) {
      return { success: false, error: "File type not allowed." };
    }

    const buffer = Buffer.from(cleanBase64, "base64");
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      return { success: false, error: `File exceeds maximum size of ${maxSizeMb}MB.` };
    }

    // Determine extension
    let extension = "bin";
    const extensionFromMime = mimeType.split("/")[1];
    if (extensionFromMime) {
      extension = extensionFromMime === "jpeg" ? "jpg" : extensionFromMime;
      if (extension.includes("+")) {
        extension = extension.split("+")[0];
      }
    }

    const dataUrl = base64Str.startsWith("data:") ? base64Str : `data:${mimeType};base64,${cleanBase64}`;

    if (process.env.VERCEL === "1") {
      return { success: true, url: dataUrl };
    }

    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      let fileName = "";
      if (originalFileName) {
        const safeName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
        fileName = `${fileNamePrefix}_${Date.now()}_${safeName}`;
      } else {
        fileName = `${fileNamePrefix}_${Date.now()}.${extension}`;
      }

      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);

      return { success: true, url: `/uploads/${fileName}` };
    } catch (writeError) {
      console.warn("Local filesystem write failed, falling back to data URL:", writeError);
      return { success: true, url: dataUrl };
    }
  } catch (error) {
    console.error("saveBase64File error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to write file." };
  }
}
