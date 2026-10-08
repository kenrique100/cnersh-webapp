const mockConstruct = jest.fn();
const mockUploadFiles = jest.fn().mockResolvedValue("uploaded");
const mockDeleteFiles = jest.fn().mockResolvedValue("deleted");
const mockGenerateSignedURL = jest.fn();
const mockGenerateSignedUrl = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockApi: {
    uploadFiles: typeof mockUploadFiles;
    deleteFiles: typeof mockDeleteFiles;
    generateSignedURL?: typeof mockGenerateSignedURL;
    generateSignedUrl?: typeof mockGenerateSignedUrl;
    getSignedUrl?: typeof mockGetSignedUrl;
} = {
    uploadFiles: mockUploadFiles,
    deleteFiles: mockDeleteFiles,
    generateSignedURL: mockGenerateSignedURL,
    generateSignedUrl: mockGenerateSignedUrl,
    getSignedUrl: mockGetSignedUrl,
};

jest.mock("uploadthing/server", () => ({
    UTApi: jest.fn().mockImplementation((...args: unknown[]) => {
        mockConstruct(...args);
        return mockApi;
    }),
}));

describe("uploadthing client", () => {
    beforeEach(() => {
        jest.resetModules();
        mockConstruct.mockClear();
        mockUploadFiles.mockClear();
        mockDeleteFiles.mockClear();
        mockGenerateSignedURL.mockReset();
        mockGenerateSignedUrl.mockReset();
        mockGetSignedUrl.mockReset();
        mockApi.generateSignedURL = mockGenerateSignedURL;
        mockApi.generateSignedUrl = mockGenerateSignedUrl;
        mockApi.getSignedUrl = mockGetSignedUrl;
    });

    it("does not construct the client when the module is imported", async () => {
        await import("@/lib/uploadthing");
        expect(mockConstruct).not.toHaveBeenCalled();
    });

    it("constructs the client once, on first use, and reuses it", async () => {
        const { utapi } = await import("@/lib/uploadthing");

        await expect(utapi.deleteFiles("key-1")).resolves.toBe("deleted");
        await expect(utapi.uploadFiles({} as never)).resolves.toBe("uploaded");

        expect(mockConstruct).toHaveBeenCalledTimes(1);
        expect(mockDeleteFiles).toHaveBeenCalledWith("key-1");
        expect(mockUploadFiles).toHaveBeenCalledTimes(1);
    });

    it("exposes the same instance through getUtapi", async () => {
        const { getUtapi } = await import("@/lib/uploadthing");

        expect(getUtapi()).toBe(getUtapi());
        expect(mockConstruct).toHaveBeenCalledTimes(1);
    });

    it("forwards a single deleteFiles key through the lazy wrapper", async () => {
        const { utapi } = await import("@/lib/uploadthing");

        await utapi.deleteFiles("a");

        expect(mockDeleteFiles).toHaveBeenCalledWith("a");
    });

    it("forwards an array of deleteFiles keys through the lazy wrapper", async () => {
        const { utapi } = await import("@/lib/uploadthing");

        await utapi.deleteFiles(["a", "b"]);

        expect(mockDeleteFiles).toHaveBeenCalledWith(["a", "b"]);
    });

    it("forwards deleteFiles with an options object through the lazy wrapper", async () => {
        const { utapi } = await import("@/lib/uploadthing");

        const opts = {} as Parameters<typeof utapi.deleteFiles>[1];
        await utapi.deleteFiles("a", opts);

        expect(mockDeleteFiles).toHaveBeenCalledWith("a", opts);
    });

    it("forwards uploadFiles and its options through the lazy wrapper", async () => {
        const { utapi } = await import("@/lib/uploadthing");

        const f1 = {} as never;
        const opts = {} as Parameters<typeof utapi.uploadFiles>[1];
        await utapi.uploadFiles(f1, opts);

        expect(mockUploadFiles).toHaveBeenCalledWith(f1, opts);
    });

    it("prefers generateSignedURL for URL signing", async () => {
        const { getSignedUrl } = await import("@/lib/uploadthing");
        mockGenerateSignedURL.mockResolvedValueOnce("https://signed.example/file");

        await expect(getSignedUrl("key-1", 120)).resolves.toBe("https://signed.example/file");
        expect(mockGenerateSignedURL).toHaveBeenCalledWith("key-1", { expiresIn: 120 });
        expect(mockGenerateSignedUrl).not.toHaveBeenCalled();
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it("falls back to getSignedUrl when generateSignedURL methods are absent", async () => {
        const { getSignedUrl } = await import("@/lib/uploadthing");
        mockApi.generateSignedURL = undefined;
        mockApi.generateSignedUrl = undefined;
        mockGetSignedUrl.mockResolvedValueOnce({ url: "https://signed.example/fallback" });

        await expect(getSignedUrl("key-2", 180)).resolves.toBe("https://signed.example/fallback");
        expect(mockGetSignedUrl).toHaveBeenCalledWith("key-2", { expiresIn: 180 });
    });
});