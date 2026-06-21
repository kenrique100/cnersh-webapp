
export async function performBasicMalwareCheck(buffer: Buffer, filename: string) {
  const dangerousExtensions = [
    ".exe", ".bat", ".cmd", ".sh", ".php", ".js",
    ".vbs", ".scr", ".dll", ".msi", ".ps1"
  ];

  const lowerFilename = filename.toLowerCase();
  if (dangerousExtensions.some(ext => lowerFilename.endsWith(ext))) {
    return { safe: false, error: "File extension is not allowed for security reasons." };
  }

  if (buffer.length >= 2) {
    const header = buffer.subarray(0, 2).toString("ascii");
    if (header === "MZ") {
      return { safe: false, error: "Executable file signatures detected." };
    }
  }

  return { safe: true };
}