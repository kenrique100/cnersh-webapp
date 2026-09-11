import { PDFDocument } from 'pdf-lib';
import { MAX_DOCUMENT_PAGES } from '@/lib/file-limits';

export interface PDFValidationResult {
  valid: boolean;
  pageCount?: number;
  error?: string;
}

export async function validatePDFPageCount(file: File): Promise<PDFValidationResult> {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File is not a PDF.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      return {
        valid: false,
        pageCount: 0,
        error: 'PDF is empty (0 pages). Please upload a PDF with at least 1 page.',
      };
    }

    if (pageCount > MAX_DOCUMENT_PAGES) {
      return {
        valid: false,
        pageCount,
        error: `PDF has ${pageCount} pages. Maximum allowed is ${MAX_DOCUMENT_PAGES} pages.`,
      };
    }

    return { valid: true, pageCount };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error
          ? `Failed to validate PDF: ${err.message}`
          : 'Failed to validate PDF. File may be corrupted or invalid.',
    };
  }
}