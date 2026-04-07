import {
    sanitizeHtml,
    sanitizeText,
    escapeHtml,
    sanitizeUrl,
    sanitizeFilename,
    sanitizeObject,
} from '../sanitize';

describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
        const input = '<p>Hello <strong>World</strong></p>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<p>');
        expect(result).toContain('<strong>');
    });

    it('should remove script tags', () => {
        const input = '<p>Hello</p><script>alert("XSS")</script>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
    });

    it('should remove dangerous event handlers', () => {
        const input = '<p onclick="alert(\'XSS\')">Click me</p>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onclick');
    });

    it('should handle empty input', () => {
        expect(sanitizeHtml('')).toBe('');
        expect(sanitizeHtml(null as any)).toBe('');
    });
});

describe('sanitizeText', () => {
    it('should remove all HTML tags', () => {
        const input = '<p>Hello <strong>World</strong></p>';
        const result = sanitizeText(input);
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).toContain('Hello');
        expect(result).toContain('World');
    });

    it('should remove script content', () => {
        const input = 'Hello<script>alert("XSS")</script>World';
        const result = sanitizeText(input);
        expect(result).not.toContain('script');
        expect(result).not.toContain('alert');
    });
});

describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
        const input = '<div>Test & "quotes"</div>';
        const result = escapeHtml(input);
        expect(result).toBe('&lt;div&gt;Test &amp; &quot;quotes&quot;&lt;&#x2F;div&gt;');
    });

    it('should escape single quotes', () => {
        const input = "It's a test";
        const result = escapeHtml(input);
        expect(result).toContain('&#x27;');
    });
});

describe('sanitizeUrl', () => {
    it('should allow valid HTTP URLs', () => {
        const input = 'https://example.com/path';
        const result = sanitizeUrl(input);
        expect(result).toBe(input);
    });

    it('should block javascript: URLs', () => {
        const input = 'javascript:alert("XSS")';
        const result = sanitizeUrl(input);
        expect(result).toBe('');
    });

    it('should block data: URLs', () => {
        const input = 'data:text/html,<script>alert("XSS")</script>';
        const result = sanitizeUrl(input);
        expect(result).toBe('');
    });

    it('should allow relative URLs starting with /', () => {
        const input = '/path/to/page';
        const result = sanitizeUrl(input);
        expect(result).toBe(input);
    });

    it('should block // URLs (protocol-relative)', () => {
        const input = '//evil.com/path';
        const result = sanitizeUrl(input);
        expect(result).toBe('');
    });
});

describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
        const input = '../../../etc/passwd';
        const result = sanitizeFilename(input);
        expect(result).not.toContain('..');
    });

    it('should remove path separators', () => {
        const input = 'path/to/file.txt';
        const result = sanitizeFilename(input);
        expect(result).not.toContain('/');
    });

    it('should allow alphanumeric and common characters', () => {
        const input = 'my-file_name.txt';
        const result = sanitizeFilename(input);
        expect(result).toBe('my-file_name.txt');
    });

    it('should replace invalid characters with underscore', () => {
        const input = 'file<name>.txt';
        const result = sanitizeFilename(input);
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });
});

describe('sanitizeObject', () => {
    it('should sanitize string values in object', () => {
        const input = {
            name: '<script>alert("XSS")</script>John',
            email: 'test@example.com',
        };
        const result = sanitizeObject(input);
        expect(result.name).not.toContain('<script>');
        expect(result.email).toBe('test@example.com');
    });

    it('should sanitize string arrays', () => {
        const input = {
            tags: ['<script>XSS</script>', 'valid-tag'],
        };
        const result = sanitizeObject(input);
        expect(result.tags[0]).not.toContain('<script>');
        expect(result.tags[1]).toBe('valid-tag');
    });

    it('should handle nested objects', () => {
        const input = {
            user: {
                name: '<b>Test</b>',
            },
        };
        const result = sanitizeObject(input);
        expect(result.user.name).not.toContain('<b>');
    });
});
