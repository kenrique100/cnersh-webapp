import { PDFParse } from "pdf-parse";
import JSZip from "jszip";
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_PAGES, MAX_FILE_SIZES } from "./file-utils";

const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "video/mp4", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "video/webm", offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { mime: "video/ogg", offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },
  { mime: "audio/mpeg", offset: 0, bytes: [0xff, 0xfb] },
  { mime: "audio/mpeg", offset: 0, bytes: [0x49, 0x44, 0x33] },
  { mime: "audio/wav", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "audio/ogg", offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },
  { mime: "audio/mp4", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "application/pdf", offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "application/zip", offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
];

async function detectMimeFromBuffer(buf: Buffer): Promise<string | null> {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (slice.length < sig.bytes.length) continue;
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      if (sig.mime === "image/webp" && buf.subarray(8, 12).toString("ascii") !== "WEBP") continue;
      if (sig.mime === "audio/wav" && buf.subarray(8, 12).toString("ascii") !== "WAVE") continue;
      if (sig.mime === "application/zip") {
        const zip = await JSZip.loadAsync(buf);
        if (zip.file("word/document.xml")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return null;
      }
      return sig.mime;
    }
  }
  return null;
}

async function validatePdf(buffer: Buffer, maxPages: number) {
  try {
    const parser = new PDFParse({ data: buffer });
    const info = await parser.getInfo();

    // Fix: The v2 API exposes the page count via the `total` property.
    const pageCount = info?.total || 0;

    if (pageCount === 0) return { valid: false, error: "PDF is empty (0 pages)." };
    if (pageCount > maxPages) return { valid: false, error: `PDF exceeds ${maxPages} pages (has ${pageCount}).` };

    return { valid: true, pageCount };
  } catch {
    return { valid: false, error: "Invalid or corrupted PDF file." };
  }
}

async function validateDocx(buffer: Buffer, maxPages: number) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) return { valid: false, error: "Not a valid DOCX file." };
    const xml = await docFile.async("text");
    const hasText = /<w:t[^>]*>([^<]*)<\/w:t>/.test(xml);
    if (!hasText) return { valid: false, error: "Document is empty." };
    const explicitBreaks = (xml.match(/<w:br\s+w:type="page"\s*\/>/gi) || []).length;
    const renderedBreaks = (xml.match(/<w:lastRenderedPageBreak\s*\/>/gi) || []).length;
    const sectionBreaks = (xml.match(/<w:sectPr/gi) || []).length;
    const pageCount = Math.max(explicitBreaks, renderedBreaks) + Math.max(1, sectionBreaks);
    if (pageCount > maxPages) return { valid: false, error: `DOCX exceeds ${maxPages} pages (estimated ${pageCount}).` };
    return { valid: true, pageCount };
  } catch {
    return { valid: false, error: "Invalid or corrupted DOCX file." };
  }
}

export async function validateFile(buffer: Buffer, file: File, options?: { maxPages?: number }) {
  const maxPages = options?.maxPages ?? MAX_DOCUMENT_PAGES;
  const sizeLimit = MAX_FILE_SIZES.document;

  if (file.size > sizeLimit) {
    return { valid: false, error: `File exceeds ${sizeLimit / (1024 * 1024)} MB limit.` };
  }

  const detected = await detectMimeFromBuffer(buffer.subarray(0, 16 * 1024));
  if (!detected) return { valid: false, error: "Unrecognised or unsupported file type." };

  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(detected)) {
    return { valid: false, error: `File type ${detected} is not allowed.` };
  }

  if (detected === "application/pdf") return validatePdf(buffer, maxPages);

  if (detected === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return validateDocx(buffer, maxPages);
  }

  return { valid: true };
}