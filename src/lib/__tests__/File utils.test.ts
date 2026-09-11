import {
    getFileUrl,
    isFileId,
    resolveFileSrc,
    validateFileSizeClient,
    MAX_FILE_SIZES,
    MAX_DOCUMENT_PAGES,
    ALLOWED_DOCUMENT_TYPES,
    getFileMetadata,
    deleteFile,
    listUserFiles,
} from '../file-utils';

import { db } from '@/lib/db';
import { utapi } from '@/lib/uploadthing';

jest.mock('@/lib/db', () => ({
    db: {
        file: {
            findUnique: jest.fn(),
            delete: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

jest.mock('@/lib/uploadthing', () => ({
    utapi: {
        deleteFiles: jest.fn(),
    },
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedUtapi = utapi as jest.Mocked<typeof utapi>;

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('constants', () => {
    it('MAX_DOCUMENT_PAGES is 4', () => {
        expect(MAX_DOCUMENT_PAGES).toBe(4);
    });

    it('ALLOWED_DOCUMENT_TYPES contains pdf and docx', () => {
        expect(ALLOWED_DOCUMENT_TYPES).toContain('application/pdf');
        expect(ALLOWED_DOCUMENT_TYPES).toContain(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
    });

    it('MAX_FILE_SIZES has correct values in bytes', () => {
        expect(MAX_FILE_SIZES.avatar).toBe(8 * 1024 * 1024);
        expect(MAX_FILE_SIZES.image).toBe(16 * 1024 * 1024);
        expect(MAX_FILE_SIZES.video).toBe(64 * 1024 * 1024);
        expect(MAX_FILE_SIZES.audio).toBe(8 * 1024 * 1024);
        expect(MAX_FILE_SIZES.document).toBe(16 * 1024 * 1024);
        expect(MAX_FILE_SIZES.protocol).toBe(64 * 1024 * 1024);
    });
});

describe('getFileUrl', () => {
    it('returns the correct API path for a file ID', () => {
        expect(getFileUrl(VALID_UUID)).toBe(`/api/files/${VALID_UUID}`);
    });
});

describe('isFileId', () => {
    it('returns true for a valid UUID v4', () => {
        expect(isFileId(VALID_UUID)).toBe(true);
    });

    it('returns true for uppercase UUID', () => {
        expect(isFileId(VALID_UUID.toUpperCase())).toBe(true);
    });

    it('returns false for a short string', () => {
        expect(isFileId('abc123')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(isFileId('')).toBe(false);
    });

    it('returns false for a URL', () => {
        expect(isFileId('https://example.com/image.jpg')).toBe(false);
    });
});

describe('resolveFileSrc', () => {
    it('returns null for null input', () => {
        expect(resolveFileSrc(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(resolveFileSrc(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(resolveFileSrc('')).toBeNull();
    });

    it('passes through data: URLs unchanged', () => {
        const url = 'data:image/png;base64,abc==';
        expect(resolveFileSrc(url)).toBe(url);
    });

    it('passes through http URLs unchanged', () => {
        const url = 'https://cdn.example.com/photo.jpg';
        expect(resolveFileSrc(url)).toBe(url);
    });

    it('passes through /api/ paths unchanged', () => {
        const url = '/api/files/some-id';
        expect(resolveFileSrc(url)).toBe(url);
    });

    it('converts a UUID value to an API path', () => {
        expect(resolveFileSrc(VALID_UUID)).toBe(`/api/files/${VALID_UUID}`);
    });

    it('returns the value as-is when it is not a UUID and not a known prefix', () => {
        expect(resolveFileSrc('some-random-string')).toBe('some-random-string');
    });
});

describe('validateFileSizeClient', () => {
    const makeFile = (sizeBytes: number): File =>
        Object.defineProperty(new File([], 'test.jpg'), 'size', { value: sizeBytes });

    it('returns valid: true when file is within limit', () => {
        const file = makeFile(1024 * 1024);
        expect(validateFileSizeClient(file, 'image')).toEqual({ valid: true });
    });

    it('returns valid: false with error message when file exceeds limit', () => {
        const file = makeFile(MAX_FILE_SIZES.avatar + 1);
        const result = validateFileSizeClient(file, 'avatar');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('8 MB');
    });

    it('accepts a file exactly at the limit', () => {
        const file = makeFile(MAX_FILE_SIZES.document);
        expect(validateFileSizeClient(file, 'document')).toEqual({ valid: true });
    });

    it('error message names the category', () => {
        const file = makeFile(MAX_FILE_SIZES.video + 1);
        const result = validateFileSizeClient(file, 'video');
        expect(result.error).toContain('video');
    });
});

describe('getFileMetadata - integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when file is not found', async () => {
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce(null);
        const result = await getFileMetadata('nonexistent-id');
        expect(result).toBeNull();
    });

    it('falls back to API path when url is null', async () => {
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            id: VALID_UUID,
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            type: 'document',
            url: null,
            createdAt: new Date(),
        });
        const result = await getFileMetadata(VALID_UUID);
        expect(result?.url).toBe(`/api/files/${VALID_UUID}`);
    });

    it('uses stored url when present', async () => {
        const storedUrl = 'https://uploadthing.com/f/abc123';
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            id: VALID_UUID,
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            type: 'document',
            url: storedUrl,
            createdAt: new Date(),
        });
        const result = await getFileMetadata(VALID_UUID);
        expect(result?.url).toBe(storedUrl);
    });
});

describe('deleteFile - integration', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('deletes the DB row only after UploadThing confirms storage deletion', async () => {
        const storageKey = 'uploadthing-file-key-123';
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            storageKey,
        });
        mockedUtapi.deleteFiles.mockResolvedValueOnce({ success: true, deletedCount: 1 });
        (mockedDb.file.delete as jest.Mock).mockResolvedValueOnce({});

        await deleteFile(VALID_UUID);

        expect(mockedUtapi.deleteFiles).toHaveBeenCalledWith(storageKey);
        expect(mockedDb.file.delete).toHaveBeenCalledWith({
            where: { id: VALID_UUID },
        });
        expect(mockedUtapi.deleteFiles.mock.invocationCallOrder[0]).toBeLessThan(
            (mockedDb.file.delete as jest.Mock).mock.invocationCallOrder[0]
        );
    });

    it('keeps the DB row while storage deletion is still pending', async () => {
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({ storageKey: 'some-key' });
        let confirmStorageDeletion!: (result: Awaited<ReturnType<typeof utapi.deleteFiles>>) => void;
        mockedUtapi.deleteFiles.mockReturnValueOnce(new Promise((resolve) => {
            confirmStorageDeletion = resolve;
        }));

        const deletion = deleteFile(VALID_UUID);
        await Promise.resolve();

        expect(mockedUtapi.deleteFiles).toHaveBeenCalledWith('some-key');
        expect(mockedDb.file.delete).not.toHaveBeenCalled();

        confirmStorageDeletion({ success: true, deletedCount: 1 });
        await deletion;
        expect(mockedDb.file.delete).toHaveBeenCalledWith({ where: { id: VALID_UUID } });
    });

    it('does nothing when the file record does not exist', async () => {
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce(null);

        await deleteFile(VALID_UUID);

        expect(mockedUtapi.deleteFiles).not.toHaveBeenCalled();
        expect(mockedDb.file.delete).not.toHaveBeenCalled();
    });

    it('skips UploadThing deletion when file has no storageKey', async () => {
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            storageKey: null,
        });
        (mockedDb.file.delete as jest.Mock).mockResolvedValueOnce({});

        await deleteFile(VALID_UUID);

        expect(mockedUtapi.deleteFiles).not.toHaveBeenCalled();
        expect(mockedDb.file.delete).toHaveBeenCalled();
    });

    it.each([
        ['success false', { success: false, deletedCount: 0 }],
        ['success null', { success: null }],
        ['success undefined', { success: undefined }],
        ['missing success', {}],
        ['null response', null],
        ['undefined response', undefined],
    ])('keeps the DB row and throws for %s', async (_label, result) => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({ storageKey: 'some-key' });
        // Exercise malformed runtime responses as well as a normal failure.
        (mockedUtapi.deleteFiles as jest.Mock).mockResolvedValueOnce(result);

        await expect(deleteFile(VALID_UUID)).rejects.toThrow('File could not be deleted from storage');

        expect(mockedUtapi.deleteFiles).toHaveBeenCalledWith('some-key');
        expect(mockedDb.file.delete).not.toHaveBeenCalled();
    });

    it('keeps the DB record and throws when UploadThing rejects, so the object is never orphaned', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const storageKey = 'some-key';
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            storageKey,
        });
        mockedUtapi.deleteFiles.mockRejectedValueOnce(new Error('UploadThing error'));

        await expect(deleteFile(VALID_UUID)).rejects.toThrow('File could not be deleted from storage');

        expect(mockedDb.file.delete).not.toHaveBeenCalled();

        expect(consoleSpy).toHaveBeenCalledWith(
            "[file-utils] UploadThing deletion failed; keeping record for retry:",
            expect.any(Error)
        );
    });
});

describe('listUserFiles - integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns files and total count', async () => {
        const fakeFile = {
            id: VALID_UUID,
            filename: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
            type: 'image',
            url: 'https://uploadthing.com/f/photo.jpg',
            createdAt: new Date(),
        };
        (mockedDb.file.findMany as jest.Mock).mockResolvedValueOnce([fakeFile]);
        (mockedDb.file.count as jest.Mock).mockResolvedValueOnce(1);

        const result = await listUserFiles('user-id-123');

        expect(result.total).toBe(1);
        expect(result.files[0].url).toBe(fakeFile.url);
    });

    it('filters by file type when provided', async () => {
        (mockedDb.file.findMany as jest.Mock).mockResolvedValueOnce([]);
        (mockedDb.file.count as jest.Mock).mockResolvedValueOnce(0);

        await listUserFiles('user-id-123', { type: 'document' });

        expect(mockedDb.file.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ type: 'document' }),
            })
        );
    });

    it('applies pagination correctly', async () => {
        (mockedDb.file.findMany as jest.Mock).mockResolvedValueOnce([]);
        (mockedDb.file.count as jest.Mock).mockResolvedValueOnce(0);

        await listUserFiles('user-id-123', { page: 3, perPage: 5 });

        expect(mockedDb.file.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 10, take: 5 })
        );
    });
});
