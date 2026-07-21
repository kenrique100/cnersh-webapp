import { UTApi } from "uploadthing/server";

const utapi = new UTApi({
    // No config needed – reads UPLOAD THING_SECRET automatically
});

export { utapi };

/**
 * Helper to delete a file from UploadThing by its key.
 * UploadThing keys are the filename (or the complete key).
 */
export async function deleteUploadThingFile(fileKey: string) {
    await utapi.deleteFiles(fileKey);
}