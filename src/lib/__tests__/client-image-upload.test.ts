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
    it('returns the original file when it is an accepted type', async () => {
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

        // URL.createObjectURL not available in jsdom by default
        global.URL.createObjectURL = jest.fn(() => 'blob:mock');
        global.URL.revokeObjectURL = jest.fn();

        // Simulate image load failure
        const originalImage = global.Image;
        global.Image = class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            private _src = '';

            get src(): string {
                return this._src;
            }

            set src(_url: string) {
                this._src = _url;
                setTimeout(() => {
                    this.onerror?.();
                }, 0);
            }
        } as unknown as typeof Image;

        await expect(prepareImageForUpload(file)).rejects.toThrow(
            'HEIC/HEIF images are not supported by this browser. Please convert to JPEG, PNG, WebP, or GIF.',
        );

        global.Image = originalImage;
    });

    it('throws unsupported error for unknown type with empty mime', async () => {
        const file = makeFile('unknown', '');
        await expect(prepareImageForUpload(file)).rejects.toThrow(
            'Unsupported file type (unknown). Please use JPEG, PNG, WebP, or GIF.',
        );
    });
});