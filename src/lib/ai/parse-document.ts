import fs from "fs/promises";
import path from "path";

type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export type DocumentBlock =
  | {
      type: "image";
      source: { type: "base64"; media_type: ImageMediaType; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MEDIA_TYPES: Record<string, ImageMediaType> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function fileToContentBlock(
  filePath: string,
): Promise<DocumentBlock> {
  const data = await fs.readFile(filePath);
  const base64 = data.toString("base64");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }

  if (IMAGE_EXTENSIONS.includes(ext) && MEDIA_TYPES[ext]) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: MEDIA_TYPES[ext] as ImageMediaType,
        data: base64,
      },
    };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export async function saveUploadedFile(
  file: File,
  testId: string,
): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", testId);
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(uploadDir, file.name);
  await fs.writeFile(filePath, buffer);

  return filePath;
}
