"use client";

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const HEIC_CONVERSION_QUALITY = 0.92;

const HEIC_LIKE_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;

function isHeicLikeFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return HEIC_LIKE_MIME_TYPES.includes(file.type as (typeof HEIC_LIKE_MIME_TYPES)[number]) ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif");
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode image. The file may be corrupted or in an unsupported format."));
    };
    img.src = objectUrl;
  });
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to initialize canvas for image conversion.");
  ctx.drawImage(img, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", HEIC_CONVERSION_QUALITY);
  });

  if (!blob) throw new Error("Failed to convert HEIC/HEIF image to JPEG. Your browser may not support this conversion.");

  const normalizedName = file.name.replace(/\.(heic|heif)$/i, "") || "image";
  return new File([blob], `${normalizedName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export function isAcceptedImageType(file: File): boolean {
  return ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number]);
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (isAcceptedImageType(file)) return file;

  if (isHeicLikeFile(file)) {
    try {
      return await convertHeicToJpeg(file);
    } catch {
      throw new Error("HEIC/HEIF images are not supported by this browser. Please convert to JPEG, PNG, WebP, or GIF.");
    }
  }

  throw new Error(`Unsupported file type (${file.type || "unknown"}). Please use JPEG, PNG, WebP, or GIF.`);
}
