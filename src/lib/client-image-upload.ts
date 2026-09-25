// Client-side image upload utilities with proper blob URL lifecycle management

const HEIC_LIKE_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;

const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function isHeicLikeFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
      (HEIC_LIKE_MIME_TYPES as readonly string[]).includes(file.type) ||
      lowerName.endsWith(".heic") ||
      lowerName.endsWith(".heif")
  );
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      reject(
          new Error(
              "Unable to decode image. The file may be corrupted or in an unsupported format."
          )
      );
    };

    img.src = objectUrl;
  });
}

/** Returns true if the file's MIME type is an accepted image format. */
export function isAcceptedImageType(file: File): boolean {
  return SUPPORTED_FORMATS.includes(file.type);
}

export async function prepareImageForUpload(file: File): Promise<File> {
  // HEIC/HEIF detection and rejection
  if (isHeicLikeFile(file)) {
    throw new Error(
        "HEIC/HEIF images are not supported by this browser. Please convert to JPEG, PNG, WebP, or GIF."
    );
  }

  // Immediately reject non‑supported types
  const typeDisplay = file.type || file.name.split(".").pop() || "unknown";
  if (!SUPPORTED_FORMATS.includes(file.type) && !isHeicLikeFile(file)) {
    throw new Error(
        `Unsupported file type (${typeDisplay}). Please use JPEG, PNG, WebP, or GIF.`
    );
  }

  // Validate image can be loaded
  try {
    await loadImageFromFile(file);
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to validate image format");
  }

  return file;
}

/**
 * Create a preview blob URL for immediate client-side display.
 * IMPORTANT: Caller must revoke this URL when done to prevent memory leaks.
 */
export function createPreviewBlobUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview blob URL created by createPreviewBlobUrl.
 */
export function revokePreviewBlobUrl(blobUrl: string): void {
  try {
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Ignore errors during revocation
  }
}

/**
 * Crop a region from an <img> element and return a square JPEG File
 * suitable for uploading as a profile picture.
 *
 * The `crop` coordinates are in the DISPLAYED image's pixel space
 * (the same values ReactCrop gives you in its onChange callback).
 * This function rescales them to the image's natural resolution
 * so the crop is accurate regardless of how the image is displayed.
 *
 * @param image       - The loaded HTMLImageElement (must have a real naturalWidth)
 * @param crop        - Crop rectangle in displayed pixels
 * @param outputSize  - Side length of the output square in pixels (default 512)
 */
export async function cropImageToSquareFile(
    image: HTMLImageElement,
    crop: { x: number; y: number; width: number; height: number },
    outputSize = 512
): Promise<File> {
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("Image is not fully loaded yet.");
  }
  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error("Crop area is invalid. Please select a region first.");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Clamp the crop to the image bounds so we never read outside the source.
  const srcX = Math.max(0, crop.x) * scaleX;
  const srcY = Math.max(0, crop.y) * scaleY;
  const srcW = Math.min(crop.width, image.width - crop.x) * scaleX;
  const srcH = Math.min(crop.height, image.height - crop.y) * scaleY;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas 2D context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
      image,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      outputSize,
      outputSize
  );

  const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
  );

  if (!blob) throw new Error("Failed to create cropped image blob");

  return new File([blob], "profile.jpg", { type: "image/jpeg" });
}