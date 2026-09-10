import { parseHtmlMetadata } from '../extract-metadata';

describe('parseHtmlMetadata', () => {
    const baseUrl = 'https://example.com';

    it('extracts og:title, og:description, og:image', () => {
        const html = `
      <html>
        <head>
          <meta property="og:title" content="Test Title" />
          <meta property="og:description" content="Test Description" />
          <meta property="og:image" content="https://example.com/image.jpg" />
        </head>
      </html>`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.title).toBe('Test Title');
        expect(result.description).toBe('Test Description');
        expect(result.image).toBe('https://example.com/image.jpg');
    });

    it('falls back to twitter:title and twitter:description', () => {
        const html = `
      <meta property="twitter:title" content="Twitter Title" />
      <meta property="twitter:description" content="Twitter Desc" />`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.title).toBe('Twitter Title');
        expect(result.description).toBe('Twitter Desc');
    });

    it('falls back to <title> and meta name="description"', () => {
        const html = `
      <title>Page Title</title>
      <meta name="description" content="Meta Desc" />`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.title).toBe('Page Title');
        expect(result.description).toBe('Meta Desc');
    });

    it('resolves relative image URLs using baseUrl', () => {
        const html = `<meta property="og:image" content="/images/photo.jpg" />`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.image).toBe('https://example.com/images/photo.jpg');
    });

    it('handles protocol-relative image URL', () => {
        const html = `<meta property="og:image" content="//cdn.example.com/img.png" />`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.image).toBe('https://cdn.example.com/img.png');
    });

    it('decodes HTML entities', () => {
        const html = `<meta property="og:title" content="Rock &amp; Roll" />`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.title).toBe('Rock & Roll');
    });

    it('truncates title to 200 chars and description to 300', () => {
        const longTitle = 'x'.repeat(250);
        const longDesc = 'y'.repeat(400);
        const html = `<meta property="og:title" content="${longTitle}" /><meta property="og:description" content="${longDesc}" />`;
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.title.length).toBe(200);
        expect(result.description.length).toBe(300);
    });

    it('returns empty strings when no meta tags present', () => {
        const html = '<html></html>';
        const result = parseHtmlMetadata(html, baseUrl);
        expect(result.title).toBe('');
        expect(result.description).toBe('');
        expect(result.image).toBe('');
    });
});