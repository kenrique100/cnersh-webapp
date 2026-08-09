import { isAcceptedImageType, prepareImageForUpload } from '@/lib/client-image-upload';

const makeFile = (name: string, type: string): File =>
    new File([], name, { type });

describe('isAcceptedImageType', () => {
    it('returns true for image/jpeg', () => {
        expect(isAcceptedImageType(makeFile('photo.jpg', 'image/jpeg'))).toBe(true);
    });

    it('returns true for image/png', () => {
        expect(isAcceptedImageType(makeFile('photo.png', 'image/png'))).toBe(true);
    });

    it('returns true for image/webp', () => {
        expect(isAcceptedImageType(makeFile('photo.webp', 'image/webp'))).toBe(true);
    });

    it('returns true for image/gif', () => {
        expect(isAcceptedImageType(makeFile('photo.gif', 'image/gif'))).toBe(true);
    });

    it('returns false for image/heic', () => {
        expect(isAcceptedImageType(makeFile('photo.heic', 'image/heic'))).toBe(false);
    });

    it('returns false for application/pdf', () => {
        expect(isAcceptedImageType(makeFile('doc.pdf', 'application/pdf'))).toBe(false);
    });
});

describe('prepareImageForUpload', () => {
    // Restore globals after each test
    const originalURL = global.URL;
    const originalImage = global.Image;

    afterEach(() => {
        global.URL = originalURL;
        global.Image = originalImage;
    });

    it('returns the original file when it is an accepted type', async () => {
        // Mock URL.createObjectURL (required by loadImageFromFile)
        global.URL = {
            ...originalURL,
            createObjectURL: jest.fn(() => 'blob:mock'),
            revokeObjectURL: jest.fn(),
        } as unknown as typeof URL;

        // Mock Image to trigger onload immediately
        global.Image = class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            private _src = '';

            get src(): string { return this._src; }
            set src(_url: string) {
                this._src = _url;
                // Simulate successful image load
                setTimeout(() => this.onload?.(), 0);
            }
        } as unknown as typeof Image;

        const file = makeFile('photo.jpg', 'image/jpeg');
        const result = await prepareImageForUpload(file);
        expect(result).toBe(file);
    });

    it('throws unsupported error for non-HEIC unsupported type', async () => {
        const file = makeFile('doc.pdf', 'application/pdf');
        await expect(prepareImageForUpload(file)).rejects.toThrow(
            'Unsupported file type (application/pdf). Please use JPEG, PNG, WebP, or GIF.',
        );
    });

    it('throws browser unsupported error when HEIC conversion fails', async () => {
        const file = makeFile('photo.heic', 'image/heic');

        // URL mocks required for HEIC path
        global.URL = {
            ...originalURL,
            createObjectURL: jest.fn(() => 'blob:mock'),
            revokeObjectURL: jest.fn(),
        } as unknown as typeof URL;

        // Simulate image load failure
        global.Image = class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            private _src = '';

            get src(): string { return this._src; }
            set src(_url: string) {
                this._src = _url;
                setTimeout(() => this.onerror?.(), 0);
            }
        } as unknown as typeof Image;

        await expect(prepareImageForUpload(file)).rejects.toThrow(
            'HEIC/HEIF images are not supported by this browser. Please convert to JPEG, PNG, WebP, or GIF.',
        );
    });

    it('throws unsupported error for unknown type with empty mime', async () => {
        const file = makeFile('unknown', '');
        await expect(prepareImageForUpload(file)).rejects.toThrow(
            'Unsupported file type (unknown). Please use JPEG, PNG, WebP, or GIF.',
        );
    });
});