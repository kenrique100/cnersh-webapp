import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';

// Use standard import; jest.mock factory can access it because imports are hoisted
jest.mock('lucide-react', () => ({
    ExternalLinkIcon: (props: React.SVGProps<SVGSVGElement>) =>
        React.createElement('svg', { 'data-testid': 'external-icon', ...props }),
}));

import CtaLinkButton, {
    getCtaLabel,
    CTA_LINK_TYPES,
    DEFAULT_LINK_TYPE,
} from '../cta-link-button';

describe('getCtaLabel', () => {
    test.each(CTA_LINK_TYPES.map(({ value, label }) => [value, label]))(
        'maps %s -> %s',
        (value, label) => {
            expect(getCtaLabel(value as string)).toBe(label);
        }
    );

    test('fallbacks', () => {
        expect(getCtaLabel(undefined)).toBe('Visit Website');
        expect(getCtaLabel(null)).toBe('Visit Website');
        expect(getCtaLabel('unknown')).toBe('Visit Website');
    });

    test('DEFAULT_LINK_TYPE consistency', () => {
        expect(DEFAULT_LINK_TYPE).toBe('visit_website');
        expect(getCtaLabel(DEFAULT_LINK_TYPE)).toBe('Visit Website');
    });
});

describe('CtaLinkButton', () => {
    test.each(['https://example.com', 'https://example.com/path?q=1#h'])(
        'renders for safe url: %s',
        (url) => {
            render(<CtaLinkButton url={url} />);
            const link = screen.getByRole('link', { name: /visit website/i });
            expect(link).toHaveAttribute('href', url);
            expect(link).toHaveAttribute('target', '_blank');
            expect(link.getAttribute('rel') || '').toEqual(
                expect.stringContaining('noopener')
            );
            expect(link.getAttribute('rel') || '').toEqual(
                expect.stringContaining('noreferrer')
            );
            expect(within(link).getByTestId('external-icon')).toBeInTheDocument();
        }
    );

    test('uses label for provided linkType', () => {
        render(
            <CtaLinkButton url="https://example.com" linkType="apply_now" />
        );
        expect(screen.getByRole('link', { name: /apply now/i })).toBeInTheDocument();
    });

    test('falls back label for unknown/null/undefined', () => {
        const { rerender } = render(
            <CtaLinkButton url="https://example.com" linkType="nope" />
        );
        expect(screen.getByRole('link', { name: /visit website/i })).toBeInTheDocument();

        rerender(<CtaLinkButton url="https://example.com" linkType={null} />);
        expect(screen.getByRole('link', { name: /visit website/i })).toBeInTheDocument();

        rerender(<CtaLinkButton url="https://example.com" />);
        expect(screen.getByRole('link', { name: /visit website/i })).toBeInTheDocument();
    });

    test('merges custom className', () => {
        render(
            <CtaLinkButton url="https://example.com" className="extra-class" />
        );
        const link = screen.getByRole('link', { name: /visit website/i });
        expect(link).toHaveClass('extra-class');
    });

    test('uses a modest rectangular radius', () => {
        render(<CtaLinkButton url="https://example.com" />);
        const link = screen.getByRole('link', { name: /visit website/i });
        expect(link).toHaveClass('rounded-md');
        expect(link).not.toHaveClass('rounded-full');
    });

    test.each([
        'javascript:alert(1)',
        'ftp://example.com',
        '/relative/path',
        'mailto:test@example.com',
        'data:text/plain;base64,SGVsbG8=',
        'file:///etc/passwd',
        'about:blank',
        '',
        'not-a-url',
    ])('does not render for unsafe url: %s', (url) => {
        render(<CtaLinkButton url={url} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
