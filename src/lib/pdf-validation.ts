/**
 * Client-side PDF validation utilities.
 * Validates PDF page count before upload to provide immediate feedback.
 */

import { pdf } from 'pdf-page-counter';

export interface PDFValidationResult {
  valid: boolean;
  pageCount?: number;
  error?: string;
}

/**
 * Validate PDF file on the client side.
 * Checks:
 * - File is a valid PDF
 * - Page count is between 1 and 4 (inclusive)
 *
 * @param file - The File object to validate
 * @returns Validation result with page count and error message if invalid
 */
export async function validatePDFPageCount(
  file: File
): Promise<PDFValidationResult> {
  // Verify file type
  if (file.type !== 'application/pdf') {
    return {
      valid: false,
      error: 'File is not a PDF.',
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdf(Buffer.from(buffer));
    const pageCount = pdfDoc.numpages;

    if (pageCount === 0) {
      return {
        valid: false,
        pageCount: 0,
        error: 'PDF is empty (0 pages). Please upload a PDF with at least 1 page.',
      };
    }

    if (pageCount > 4) {
      return {
        valid: false,
        pageCount,
        error: `PDF has ${pageCount} pages. Maximum allowed is 4 pages.`,
      };
    }

    return {
      valid: true,
      pageCount,
    };
  } catch (err) {
    return {
      valid: false,
      error:
        err instanceof Error
          ? `Failed to validate PDF: ${err.message}`
          : 'Failed to validate PDF. File may be corrupted or invalid.',
    };
  }
}
