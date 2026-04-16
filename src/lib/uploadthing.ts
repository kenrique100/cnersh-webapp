/**
 * uploadthing.ts
 *
 * Client-side UploadThing helpers. Import these in your React components
 * instead of building fetch calls manually.
 *
 * Usage example:
 *   const { startUpload, isUploading } = useUploadThing("imageUploader");
 *   const results = await startUpload([file]);
 *   // results[0].url  ← direct CDN URL, store this in your DB / state
 */

import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// ─── Drop-in Upload Button ─────────────────────────────────────────────────
// <UploadButton endpoint="imageUploader" onClientUploadComplete={...} />
export const UploadButton = generateUploadButton<OurFileRouter>();

// ─── Drop-in Dropzone ──────────────────────────────────────────────────────
// <UploadDropzone endpoint="imageUploader" onClientUploadComplete={...} />
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// ─── Headless hook ─────────────────────────────────────────────────────────
// const { startUpload, isUploading } = useUploadThing("imageUploader");
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
