import { NextRequest, NextResponse } from 'next/server';
import { authSession } from '@/lib/auth-utils';
import { performBasicMalwareCheck } from '@/lib/file-validation';
import { sanitizeFilename } from '@/lib/sanitize-filename';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import type { FileType } from '@/generated/prisma';
import { withIdempotency } from '@/middleware/idempotency';
import { uploadFileToVercelBlob } from '@/lib/vercel-blob-client';
import { pdf } from 'pdf-page-counter';

export const maxDuration = 60;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_SIZE = 8 * 1024 * 1024;

function resolveFileType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

async function uploadHandler(req: NextRequest): Promise<NextResponse> {
  const session = await authSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const sanitizedFilename = sanitizeFilename(file.name);
  if (!sanitizedFilename) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });

  let allowedTypes: string[];
  let maxSize: number;

  if (file.type.startsWith('video/')) {
    allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    maxSize = MAX_VIDEO_SIZE;
  } else if (file.type.startsWith('image/')) {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    maxSize = MAX_IMAGE_SIZE;
  } else if (file.type.startsWith('audio/')) {
    allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];
    maxSize = MAX_AUDIO_SIZE;
  } else {
    allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    maxSize = MAX_DOCUMENT_SIZE;
  }

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} is not allowed.` }, { status: 400 });
  }
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File exceeds size limit.' }, { status: 400 });
  }

  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Failed to read file data' }, { status: 500 });
  }

  const malwareCheck = await performBasicMalwareCheck(fileBuffer, file.name);
  if (!malwareCheck.safe) {
    return NextResponse.json({ error: malwareCheck.error || 'File failed security check' }, { status: 400 });
  }

  const fileCategory = resolveFileType(file.type);

  // Document validation (only for PDFs, using lightweight pdf-page-counter)
  if (fileCategory === 'document' && file.type === 'application/pdf') {
    try {
      const pdfDoc = await pdf(fileBuffer);
      if (pdfDoc.numpages > 4) {
        return NextResponse.json({ error: 'PDF exceeds 4 pages' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid or corrupted PDF file' }, { status: 400 });
    }
  }

  let uploadedUrl: string;
  try {
    const blob = await uploadFileToVercelBlob(file, { access: 'private' });
    uploadedUrl = blob.url;
  } catch (err) {
    console.error('[upload] Vercel Blob upload failed:', err);
    return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 502 });
  }

  try {
    const stored = await db.file.create({
      data: {
        filename: sanitizedFilename,
        mimeType: file.type,
        size: file.size,
        data: null,
        url: uploadedUrl,
        type: fileCategory,
        userId: session.user.id,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        type: true,
        createdAt: true,
        url: true,
      },
    });

    return NextResponse.json({
      fileId: stored.id,
      url: stored.url,
      name: stored.filename,
      type: stored.mimeType,
      size: stored.size,
      category: stored.type,
      createdAt: stored.createdAt,
    });
  } catch (err) {
    console.error('[upload] DB write failed:', err);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}

const rateLimitedUploadHandler = withRateLimit(uploadHandler, RATE_LIMITS.fileUpload, {
  keyPrefix: 'upload',
  getUserId: async () => {
    const session = await authSession();
    return session?.user?.id;
  },
});

const idempotentHandler = withIdempotency(rateLimitedUploadHandler, {
  lockTtlSeconds: 60,
  responseTtlSeconds: 24 * 60 * 60,
});

export async function POST(req: NextRequest) {
  try {
    return await idempotentHandler(req);
  } catch (err) {
    console.error('[upload] unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}