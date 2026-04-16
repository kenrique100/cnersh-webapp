// Jest mock for isomorphic-dompurify
// Provides a simple sanitization that removes HTML tags for testing purposes

function removeTags(dirty: string): string {
    return dirty
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '');
}

const DOMPurify = {
    sanitize(dirty: string, config?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[]; KEEP_CONTENT?: boolean }) {
        if (!dirty || typeof dirty !== 'string') return '';
        if (config?.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
            return removeTags(dirty);
        }
        // For allowed-tags config: strip script but allow safe tags
        return dirty
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/\s+on\w+="[^"]*"/gi, '')
            .replace(/\s+on\w+='[^']*'/gi, '')
            .replace(/javascript:[^"']*/gi, '');
    },
};

export default DOMPurify;
export const { sanitize } = DOMPurify;
