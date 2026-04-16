"use client";

import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { uploadFiles } from "@/lib/uploadthing";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Extracts the best available file URL from an UploadThing client response item.
 * Supports top-level URL fields and serverData URL fields across response variants.
 */
export function extractUploadThingFileUrl(file: unknown): string | null {
  if (!file || typeof file !== "object") return null;

  const candidate = file as {
    url?: unknown;
    ufsUrl?: unknown;
    appUrl?: unknown;
    serverData?: unknown;
  };

  const directUrl =
    asString(candidate.url) ??
    asString(candidate.ufsUrl) ??
    asString(candidate.appUrl);
  if (directUrl) return directUrl;

  if (!candidate.serverData || typeof candidate.serverData !== "object") {
    return null;
  }

  const serverData = candidate.serverData as {
    url?: unknown;
    ufsUrl?: unknown;
    appUrl?: unknown;
  };

  return (
    asString(serverData.url) ??
    asString(serverData.ufsUrl) ??
    asString(serverData.appUrl)
  );
}

export type UploadThingEndpoint = keyof OurFileRouter;

export async function uploadSingleFileToUploadThing(
  endpoint: UploadThingEndpoint,
  file: File
): Promise<string> {
  const uploaded = await uploadFiles(endpoint, { files: [file] });
  if (!uploaded?.length) {
    throw new Error(`Upload failed on endpoint "${endpoint}" for file "${file.name}": no upload result.`);
  }
  const url = extractUploadThingFileUrl(uploaded[0]);
  if (!url) {
    throw new Error(`Upload failed on endpoint "${endpoint}" for file "${file.name}": missing file URL.`);
  }
  return url;
}
