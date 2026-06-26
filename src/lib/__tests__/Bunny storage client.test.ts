import { uploadFileToBunny, deleteFileFromBunny, storageKeyFromUrl, isBunnyUrl } from '../bunny-storage-client';

const originalEnv = process.env;

beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
        ...originalEnv,
        BUNNY_STORAGE_ZONE: 'test-zone',
        BUNNY_STORAGE_PASSWORD: 'test-password',
        BUNNY_STORAGE_API_URL: 'storage.bunnycdn.com',
        BUNNY_PULL_ZONE_URL: 'https://test.b-cdn.net',
    };
});

afterEach(() => {
    process.env = originalEnv;
});

global.fetch = jest.fn();

describe('uploadFileToBunny', () => {
    it('sends a PUT request to the correct endpoint', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const buffer = Buffer.from('test file content');
        await uploadFileToBunny(buffer, 'photo.jpg', 'cnersh-assets/images');

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('storage.bunnycdn.com/test-zone/cnersh-assets/images/'),
            expect.objectContaining({
                method: 'PUT',
                headers: expect.objectContaining({
                    AccessKey: 'test-password',
                }),
            })
        );
    });

    it('returns a url starting with the pull zone URL', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const buffer = Buffer.from('content');
        const result = await uploadFileToBunny(buffer, 'doc.pdf', 'cnersh-assets/documents');

        expect(result.url).toMatch(/^https:\/\/test\.b-cdn\.net\//);
    });

    it('returns a storageKey that contains the folder and filename', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const buffer = Buffer.from('content');
        const result = await uploadFileToBunny(buffer, 'video.mp4', 'cnersh-assets/videos');

        expect(result.storageKey).toContain('cnersh-assets/videos/');
        expect(result.storageKey).toContain('video.mp4');
    });

    it('the storageKey in url and storageKey field are consistent', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const buffer = Buffer.from('content');
        const result = await uploadFileToBunny(buffer, 'file.png', 'cnersh-assets/images');

        expect(result.url).toBe(`https://test.b-cdn.net/${result.storageKey}`);
    });

    it('sends file content as Uint8Array body', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const buffer = Buffer.from([0x01, 0x02, 0x03]);
        await uploadFileToBunny(buffer, 'file.bin', 'cnersh-assets/documents');

        const callArgs = (fetch as jest.Mock).mock.calls[0][1];
        expect(callArgs.body).toBeInstanceOf(Uint8Array);
    });

    it('throws when the API returns a non-ok status', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(
            uploadFileToBunny(Buffer.from('x'), 'file.txt', 'folder')
        ).rejects.toThrow('401');
    });

    it('throws when fetch itself rejects (network error)', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

        await expect(
            uploadFileToBunny(Buffer.from('x'), 'file.txt', 'folder')
        ).rejects.toThrow('Network failure');
    });

    it('generates a unique storage key on each call', async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true });

        const b = Buffer.from('x');
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

        const r1 = await uploadFileToBunny(b, 'file.jpg', 'folder');
        const r2 = await uploadFileToBunny(b, 'file.jpg', 'folder');

        expect(r1.storageKey).not.toBe(r2.storageKey);
        nowSpy.mockRestore();
    });
});

describe('deleteFileFromBunny', () => {
    it('sends a DELETE request to the correct endpoint', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });

        await deleteFileFromBunny('cnersh-assets/images/1234-photo.jpg');

        expect(fetch).toHaveBeenCalledWith(
            'https://storage.bunnycdn.com/test-zone/cnersh-assets/images/1234-photo.jpg',
            expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({
                    AccessKey: 'test-password',
                }),
            })
        );
    });

    it('does not throw for 404 (already deleted)', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 });

        await expect(
            deleteFileFromBunny('missing-key.jpg')
        ).resolves.toBeUndefined();
    });

    it('throws for non-404 error responses', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

        await expect(
            deleteFileFromBunny('some-key.jpg')
        ).rejects.toThrow('500');
    });

    it('throws when fetch rejects', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));

        await expect(
            deleteFileFromBunny('some-key.jpg')
        ).rejects.toThrow('Timeout');
    });
});

describe('storageKeyFromUrl', () => {
    it('extracts the storage key from a pull zone URL', () => {
        const url = 'https://test.b-cdn.net/cnersh-assets/images/1234-photo.jpg';
        expect(storageKeyFromUrl(url)).toBe('cnersh-assets/images/1234-photo.jpg');
    });

    it('handles pull zone URL with trailing slash', () => {
        process.env.BUNNY_PULL_ZONE_URL = 'https://test.b-cdn.net/';
        const url = 'https://test.b-cdn.net/cnersh-assets/docs/file.pdf';
        expect(storageKeyFromUrl(url)).toBe('cnersh-assets/docs/file.pdf');
    });

    it('falls back to pathname for unrecognised origins', () => {
        const url = 'https://other-cdn.net/some/path/file.mp4';
        const key = storageKeyFromUrl(url);
        expect(key).toBe('some/path/file.mp4');
    });

    it('returns null for a completely invalid URL', () => {
        expect(storageKeyFromUrl('not a url')).toBeNull();
    });
});

describe('isBunnyUrl', () => {
    it('returns true for a URL starting with the pull zone URL', () => {
        expect(isBunnyUrl('https://test.b-cdn.net/cnersh-assets/images/photo.jpg')).toBe(true);
    });

    it('returns false for a URL from a different host', () => {
        expect(isBunnyUrl('https://other.b-cdn.net/photo.jpg')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(isBunnyUrl('')).toBe(false);
    });

    it('returns false when BUNNY_PULL_ZONE_URL is not set', () => {
        delete process.env.BUNNY_PULL_ZONE_URL;
        expect(isBunnyUrl('https://test.b-cdn.net/photo.jpg')).toBe(false);
    });
});