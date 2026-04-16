"use client";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

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
