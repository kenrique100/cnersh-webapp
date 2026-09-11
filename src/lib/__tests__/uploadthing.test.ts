/**
 * Importing the module must never touch the environment. A module-level
 * `new UTApi()` made UPLOADTHING_SECRET a build-time requirement and failed
 * `next build` at /api/delete-blob whenever the key was absent.
 */
const construct = jest.fn();
const uploadFiles = jest.fn().mockResolvedValue("uploaded");
const deleteFiles = jest.fn().mockResolvedValue("deleted");

jest.mock("uploadthing/server", () => ({
    UTApi: jest.fn().mockImplementation((...args: unknown[]) => {
        construct(...args);
        return { uploadFiles, deleteFiles };
    }),
}));

describe("uploadthing client", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        construct.mockClear();
        uploadFiles.mockClear();
        deleteFiles.mockClear();
        process.env = { ...originalEnv };
        delete process.env.UPLOADTHING_SECRET;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("does not construct the client when the module is imported", async () => {
        await import("@/lib/uploadthing");
        expect(construct).not.toHaveBeenCalled();
    });

    it("constructs the client once, on first use, and reuses it", async () => {
        const { utapi } = await import("@/lib/uploadthing");

        await expect(utapi.deleteFiles("key-1")).resolves.toBe("deleted");
        await expect(utapi.uploadFiles({} as never)).resolves.toBe("uploaded");

        expect(construct).toHaveBeenCalledTimes(1);
        expect(deleteFiles).toHaveBeenCalledWith("key-1");
        expect(uploadFiles).toHaveBeenCalledTimes(1);
    });

    it("exposes the same instance through getUtapi", async () => {
        const { getUtapi } = await import("@/lib/uploadthing");
        expect(getUtapi()).toBe(getUtapi());
        expect(construct).toHaveBeenCalledTimes(1);
    });
});
