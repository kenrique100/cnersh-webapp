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

export async function prepareImageForUpload(file: File): Promise<File> {
  // HEIC/HEIF detection and rejection
  if (isHeicLikeFile(file)) {
    throw new Error(
      'HEIC/HEIF images are not supported by this browser. Please convert to JPEG, PNG, WebP, or GIF.'
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

  // Return original file if supported
  if (SUPPORTED_FORMATS.includes(file.type)) {
    return file;
  }

  // If mime type is empty or unsupported, attempt conversion via canvas
  // (For browsers that strip mime type)
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(img, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas conversion failed'));
            return;
          }
          const converted = new File([blob], file.name.replace(/\.[^.]*$/, '.png'), {
            type: 'image/png',
          });
          resolve(converted);
        },
        'image/png',
        0.9
      );
    });
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Image conversion failed: ${err.message}`
        : 'Image conversion failed'
    );
  }
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
