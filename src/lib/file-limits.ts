// IMPORTANT: UploadThing's `FileSize` type only accepts POWERS OF TWO:
//   1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024  +  B / KB / MB / GB
// The `ut` values below are therefore the *nearest power of 2 above* the
// real business limit. The `bytes` values are the actual enforced limit —
// checked by validateFileSizeClient() and any server-side validators.
//
// Do not "fix" UT_MAX_SIZES to match MAX_FILE_SIZES — it will not compile.

const MB = 1024 * 1024;

export const MAX_DOCUMENT_PAGES = 4;

/**
 * Real, business-enforced size limits in bytes.
 * Use these for client-side pre-checks and server-side validation.
 */
export const MAX_FILE_SIZES = {
  avatar:   8  * MB,
  image:    8  * MB,
  video:    64 * MB,
  audio:    16 * MB,
  document: 16 * MB,
  protocol: 64 * MB,
} as const;

/**
 * UploadThing route config strings. MUST be powers of two.
 * See: `FileSize` type in @uploadthing/shared.
 */
export const UT_MAX_SIZES = {
  avatar:   "8MB",
  image:    "8MB",
  video:    "64MB",
  audio:    "16MB",
  document: "16MB",
  protocol: "64MB",
} as const;

export type FileSizeCategory = keyof typeof MAX_FILE_SIZES;