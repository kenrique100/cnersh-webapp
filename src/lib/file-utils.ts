import { db } from '@/lib/db';
import { del } from '@vercel/blob';
import type { FileType } from '@/generated/prisma';

export const MAX_DOCUMENT_PAGES = 4;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_FILE_SIZES = {
  avatar:   8  * 1024 * 1024,
  image:    16 * 1024 * 1024,
  video:    64 * 1024 * 1024,
  audio:    8  * 1024 * 1024,
  document: 16 * 1024 * 1024,
  protocol: 64 * 1024 * 1024,
} as const;

export const UT_MAX_SIZES = {
  avatar:   '8MB',
  image:    '16MB',
  video:    '64MB',
  audio:    '8MB',
  document: '16MB',
  protocol: '64MB',
} as const;

export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

export function isFileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function resolveFileSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/api/'))
    return value;
  if (isFileId(value)) return getFileUrl(value);
  return value;
}

export async function getFileMetadata(fileId: string) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      type: true,
      url: true,
      createdAt: true,
    },
  });
  if (!file) return null;
  return { ...file, url: file.url ?? getFileUrl(file.id) };
}

export async function deleteFile(fileId: string): Promise<void> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { url: true, data: true },
  });

  if (file?.url && !file.data) {
    try {
      await del(file.url);
    } catch (err) {
      console.error('Vercel Blob deletion failed:', err);
    }
  }

  await db.file.delete({ where: { id: fileId } });
}

export async function listUserFiles(
    userId: string,
    options: { type?: FileType; page?: number; perPage?: number } = {}
) {
  const { type, page = 1, perPage = 20 } = options;
  const where = { userId, ...(type ? { type } : {}) };
  const [files, total] = await Promise.all([
    db.file.findMany({
      where,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        type: true,
        url: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.file.count({ where }),
  ]);
  return {
    files: files.map((f) => ({ ...f, url: f.url ?? getFileUrl(f.id) })),
    total,
  };
}

export function validateFileSizeClient(file: File, category: keyof typeof MAX_FILE_SIZES) {
  const limit = MAX_FILE_SIZES[category];
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File exceeds ${limitMB} MB limit for ${category}.` };
  }
  return { valid: true };
}