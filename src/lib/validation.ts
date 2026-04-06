import { z } from 'zod';

/**
 * Common validation schemas for reuse across the application
 */

// Email validation
export const emailSchema = z
    .string()
    .email('Invalid email address')
    .min(3, 'Email must be at least 3 characters')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim();

// Password validation
export const passwordSchema = z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Name validation
export const nameSchema = z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
    .trim();

// URL validation
export const urlSchema = z
    .string()
    .url('Invalid URL')
    .max(2048, 'URL must not exceed 2048 characters')
    .refine(
        (url) => {
            try {
                const parsed = new URL(url);
                return ['http:', 'https:'].includes(parsed.protocol);
            } catch {
                return false;
            }
        },
        { message: 'URL must use HTTP or HTTPS protocol' }
    );

// UUID validation
export const uuidSchema = z
    .string()
    .uuid('Invalid UUID format');

// Text content validation (for posts, comments, etc.)
export const textContentSchema = z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must not exceed 10,000 characters')
    .trim();

// Short text validation (for titles, etc.)
export const shortTextSchema = z
    .string()
    .min(1, 'Text cannot be empty')
    .max(255, 'Text must not exceed 255 characters')
    .trim();

// Phone number validation
export const phoneSchema = z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number must not exceed 15 characters');

// File size validation (in bytes)
export const createFileSizeSchema = (maxSizeInMB: number) =>
    z.number().max(
        maxSizeInMB * 1024 * 1024,
        `File size must not exceed ${maxSizeInMB}MB`
    );

// File type validation
export const imageFileTypeSchema = z
    .string()
    .refine(
        (type) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type),
        { message: 'File must be a JPEG, PNG, GIF, or WebP image' }
    );

export const videoFileTypeSchema = z
    .string()
    .refine(
        (type) => ['video/mp4', 'video/webm', 'video/ogg'].includes(type),
        { message: 'File must be an MP4, WebM, or OGG video' }
    );

export const documentFileTypeSchema = z
    .string()
    .refine(
        (type) =>
            [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ].includes(type),
        { message: 'File must be a PDF, Word, or Excel document' }
    );

// Date validation
export const futureDateSchema = z
    .date()
    .refine((date) => date > new Date(), { message: 'Date must be in the future' });

export const pastDateSchema = z
    .date()
    .refine((date) => date < new Date(), { message: 'Date must be in the past' });

// Pagination validation
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Validation helper that returns typed errors
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => err.message);
    return { success: false, errors };
}

/**
 * Validation middleware for API routes
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
    return (data: unknown): T => {
        return schema.parse(data);
    };
}
