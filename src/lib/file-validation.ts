const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "video/mp4": [[0x00, 0x00, 0x00, 0x18], [0x00, 0x00, 0x00, 0x20]],
  "video/webm": [[0x1a, 0x45, 0xdf, 0xa3]],
  "audio/mpeg": [[0xff, 0xfb], [0x49, 0x44, 0x33]],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46]],
  "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

const SAFE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mp3", ".wav", ".ogg", ".pdf", ".doc", ".docx", ".txt", ".csv", ".xlsx", ".pptx"]);
const DANGEROUS_PATTERNS = [/<script[\s\S]*?>/i, /javascript:/i, /vbscript:/i, /on\w+\s*=/i, /<iframe/i, /eval\s*\(/i, /document\.cookie/i];

function matchesMagicBytes(buffer: Buffer, signatures: number[][]): boolean {
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export async function performBasicMalwareCheck(buffer: Buffer, filename: string): Promise<{ safe: boolean; error?: string }> {
  if (!buffer || buffer.length === 0) return { safe: false, error: "Empty file" };
  if (buffer.length > 100 * 1024 * 1024) return { safe: false, error: "File too large for security check" };

  const lower = filename.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));
  if (ext && !SAFE_EXTENSIONS.has(ext)) return { safe: false, error: "File extension not permitted" };

  const sample = buffer.slice(0, Math.min(buffer.length, 4096)).toString("utf8");
  for (const pattern of DANGEROUS_PATTERNS) if (pattern.test(sample)) return { safe: false, error: "File contains potentially dangerous content" };
  return { safe: true };
}

export function validateMimeType(buffer: Buffer, declaredMime: string): boolean {
  const signatures = MAGIC_BYTES[declaredMime];
  if (!signatures) return true;
  return matchesMagicBytes(buffer, signatures);
}
