const MB = 1024 * 1024;

export const MAX_DOCUMENT_PAGES = 4;

export const MAX_FILE_SIZES = {
  avatar:   8 * MB,
  image:    10 * MB,
  video:    64 * MB,
  audio:    8 * MB,
  document: 10 * MB,
  protocol: 64 * MB,
} as const;

export const UT_MAX_SIZES = {
  avatar:   "8MB",
  image:    "10MB",
  video:    "64MB",
  audio:    "8MB",
  document: "10MB",
  protocol: "64MB",
} as const;
