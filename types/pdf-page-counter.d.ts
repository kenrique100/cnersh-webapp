declare module 'pdf-page-counter' {
    interface PDFInfo {
        numpages: number;
        numrender: number;
        info: Record<string, unknown>;
        metadata: Record<string, unknown>;
        version: string;
    }

    export function pdf(buffer: Buffer | Uint8Array): Promise<PDFInfo>;
}