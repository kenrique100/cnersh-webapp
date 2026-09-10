// Client-side image upload utilities with proper blob URL lifecycle management

const HEIC_LIKE_MIME_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
] as const;

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function isHeicLikeFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
      (HEIC_LIKE_MIME_TYPES as readonly string[]).includes(file.type) ||
      lowerName.endsWith('.heic') ||
      lowerName.endsWith('.heif')
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
              'Unable to decode image. The file may be corrupted or in an unsupported format.'
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
        'HEIC/HEIF images are not supported by this browser. Please convert to JPEG, PNG, WebP, or GIF.'
    );
  }

  // Immediately reject non‑supported types (the test expects an error for PDF etc.)
  const typeDisplay = file.type || file.name.split('.').pop() || 'unknown';
  if (!SUPPORTED_FORMATS.includes(file.type) && !isHeicLikeFile(file)) {
    throw new Error(
        `Unsupported file type (${typeDisplay}). Please use JPEG, PNG, WebP, or GIF.`
    );
  }

  // Validate image can be loaded
  try {
    await loadImageFromFile(file);
  } catch (err) {
    throw err instanceof Error
        ? err
        : new Error('Failed to validate image format');
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