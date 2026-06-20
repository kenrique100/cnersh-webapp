'use client';

import { useState } from 'react';

type UploadResult = {
    fileId: string;
    url: string;
    name: string;
    type: string;
    size: number;
    category: string;
    createdAt: string;
};

export function useUploadFile() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upload = async (file: File): Promise<UploadResult | null> => {
        setIsUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upload failed');
            }

            const result: UploadResult = await response.json();
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    return { upload, isUploading, error };
}