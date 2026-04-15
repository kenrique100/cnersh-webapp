import { fileTypeFromBuffer } from 'file-type';

/**
 * File type validation using magic numbers (file signatures)
 * This prevents file type spoofing by checking actual file content
 */

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    detectedType?: string;
}

/**
 * Allowed file types and their magic numbers
 */
const ALLOWED_FILE_TYPES = {
    // Images
    'image/jpeg': { extensions: ['jpg', 'jpeg'], maxSize: 8 * 1024 * 1024 }, // 8MB
    'image/png': { extensions: ['png'], maxSize: 8 * 1024 * 1024 }, // 8MB
    'image/gif': { extensions: ['gif'], maxSize: 8 * 1024 * 1024 }, // 8MB
    'image/webp': { extensions: ['webp'], maxSize: 8 * 1024 * 1024 }, // 8MB

    // Videos
    'video/mp4': { extensions: ['mp4'], maxSize: 50 * 1024 * 1024 }, // 50MB
    'video/webm': { extensions: ['webm'], maxSize: 50 * 1024 * 1024 }, // 50MB
    'video/ogg': { extensions: ['ogv', 'ogg'], maxSize: 50 * 1024 * 1024 }, // 50MB

    // Audio
    'audio/mpeg': { extensions: ['mp3'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'audio/wav': { extensions: ['wav'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'audio/ogg': { extensions: ['ogg'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'audio/webm': { extensions: ['webm'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'audio/mp4': { extensions: ['m4a', 'mp4'], maxSize: 20 * 1024 * 1024 }, // 20MB

    // Documents
    'application/pdf': { extensions: ['pdf'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'application/msword': { extensions: ['doc'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        extensions: ['docx'],
        maxSize: 20 * 1024 * 1024,
    }, // 20MB
    'application/vnd.ms-excel': { extensions: ['xls'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        extensions: ['xlsx'],
        maxSize: 20 * 1024 * 1024,
    }, // 20MB
} as const;

/**
 * Validate file using magic number detection
 */
export async function validateFileType(
    file: File | Buffer,
    allowedTypes?: string[]
): Promise<FileValidationResult> {
    try {
        // Convert File to Buffer if necessary
        let buffer: Buffer;
        if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            buffer = file;
        }

        // Detect file type using magic numbers
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) {
            return {
                valid: false,
                error: 'Could not determine file type',
            };
        }

        // Check if file type is in allowed list
        const allowed = allowedTypes || Object.keys(ALLOWED_FILE_TYPES);
        if (!allowed.includes(fileType.mime)) {
            return {
                valid: false,
                error: `File type ${fileType.mime} is not allowed`,
                detectedType: fileType.mime,
            };
        }

        return {
            valid: true,
            detectedType: fileType.mime,
        };
    } catch (error) {
        return {
            valid: false,
            error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize?: number): FileValidationResult {
    // Get max size from ALLOWED_FILE_TYPES if not specified
    const limit =
        maxSize ||
        (ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]?.maxSize ??
            50 * 1024 * 1024);

    if (file.size > limit) {
        return {
            valid: false,
            error: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed size of ${(limit / (1024 * 1024)).toFixed(2)}MB`,
        };
    }

    return { valid: true };
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
    file: File,
    options: {
        allowedTypes?: string[];
        maxSize?: number;
    } = {}
): Promise<FileValidationResult> {
    // Validate file size first (cheaper operation)
    const sizeValidation = validateFileSize(file, options.maxSize);
    if (!sizeValidation.valid) {
        return sizeValidation;
    }

    // Validate file type using magic numbers
    const typeValidation = await validateFileType(file, options.allowedTypes);
    if (!typeValidation.valid) {
        return typeValidation;
    }

    // Additional security checks
    const result = await performSecurityChecks(file);
    if (!result.valid) {
        return result;
    }

    return { valid: true, detectedType: typeValidation.detectedType };
}

/**
 * Perform additional security checks on file
 */
async function performSecurityChecks(file: File): Promise<FileValidationResult> {
    // Check for null bytes in filename (potential security issue)
    if (file.name.includes('\0')) {
        return {
            valid: false,
            error: 'Filename contains null bytes',
        };
    }

    // Check for path traversal attempts in filename
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        return {
            valid: false,
            error: 'Filename contains invalid characters',
        };
    }

    // Check filename length
    if (file.name.length > 255) {
        return {
            valid: false,
            error: 'Filename too long (max 255 characters)',
        };
    }

    return { valid: true };
}

/**
 * Get allowed file types for a category
 */
export function getAllowedFileTypes(category: 'image' | 'video' | 'audio' | 'document'): string[] {
    const types = Object.keys(ALLOWED_FILE_TYPES);

    switch (category) {
        case 'image':
            return types.filter((type) => type.startsWith('image/'));
        case 'video':
            return types.filter((type) => type.startsWith('video/'));
        case 'audio':
            return types.filter((type) => type.startsWith('audio/'));
        case 'document':
            return types.filter((type) => type.startsWith('application/'));
        default:
            return types;
    }
}

/**
 * Check if file appears to be safe (basic heuristics)
 * Note: This is NOT a replacement for proper virus scanning
 */
export async function performBasicMalwareCheck(file: File): Promise<FileValidationResult> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check for common malware signatures (very basic - NOT comprehensive)
        const suspiciousPatterns = [
            Buffer.from('MZ', 'ascii'), // DOS/Windows executable
            Buffer.from('#!/bin/bash', 'ascii'), // Bash script
            Buffer.from('#!/bin/sh', 'ascii'), // Shell script
            Buffer.from('<?php', 'ascii'), // PHP script
        ];

        for (const pattern of suspiciousPatterns) {
            if (buffer.subarray(0, pattern.length).equals(pattern)) {
                return {
                    valid: false,
                    error: 'File appears to contain executable code',
                };
            }
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: `Malware check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
