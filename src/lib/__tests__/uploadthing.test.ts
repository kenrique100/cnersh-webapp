const mockConstruct = jest.fn();
const mockUploadFiles = jest.fn().mockResolvedValue("uploaded");
const mockDeleteFiles = jest.fn().mockResolvedValue("deleted");

jest.mock("uploadthing/server", () => ({
    UTApi: jest.fn().mockImplementation((...args: unknown[]) => {
        mockConstruct(...args);
        return { uploadFiles: mockUploadFiles, deleteFiles: mockDeleteFiles };
    }),
}));

describe("uploadthing client", () => {
    beforeEach(() => {
        jest.resetModules();
        mockConstruct.mockClear();
        mockUploadFiles.mockClear();
        mockDeleteFiles.mockClear();
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
});