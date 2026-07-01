import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicPageDesktopChildItem, DynamicPageDesktopDropdown, MobileDynamicPageDropdown } from '../NavbarDynamicPageDropdown';
import type { NavbarPage } from '../types';

// Mock lucide icons
jest.mock('lucide-react', () => ({
    ChevronDownIcon: () => <span data-testid="chevron-down" />,
    DownloadIcon: () => <span data-testid="download-icon" />,
    FileTextIcon: () => <span data-testid="file-text-icon" />,
}));

const basePage: NavbarPage = {
    id: '1',
    name: 'Test Page',
    items: [
        { id: 'i1', name: 'Link 1', url: 'https://example.com', fileUrl: null },
        { id: 'i2', name: 'File 1', url: null, fileUrl: '/file.pdf' },
    ],
    children: [
        {
            id: '2',
            name: 'Child Page',
            items: [{ id: 'i3', name: 'Child Link', url: '/child', fileUrl: null }],
            children: [],
        },
    ],
};

describe('DynamicPageDesktopChildItem', () => {
    const onClose = jest.fn();

    it('renders button with page name and chevron when hasContent', () => {
        render(<DynamicPageDesktopChildItem page={basePage} onClose={onClose} />);
        expect(screen.getByRole('button')).toHaveTextContent('Test Page');
        expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    });

    it('toggles open on click and shows child items', () => {
        render(<DynamicPageDesktopChildItem page={basePage} onClose={onClose} />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(screen.getByText('Link 1')).toBeInTheDocument();
        expect(screen.getByText('File 1')).toBeInTheDocument();
        fireEvent.click(button);
        expect(screen.queryByText('Link 1')).not.toBeInTheDocument();
    });

    it('calls onClose when a link is clicked', () => {
        render(<DynamicPageDesktopChildItem page={basePage} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Link 1'));
        expect(onClose).toHaveBeenCalled();
    });

    it('renders download icon for file-only items', () => {
        render(<DynamicPageDesktopChildItem page={basePage} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getAllByTestId('download-icon').length).toBe(1);
        expect(screen.getAllByTestId('file-text-icon').length).toBeGreaterThan(0);
    });

    it('does not render empty items with no href', () => {
        const pageNoHref: NavbarPage = {
            id: '3',
            name: 'Empty',
            items: [{ id: 'e1', name: 'No link', url: null, fileUrl: null }],
            children: [],
        };
        render(<DynamicPageDesktopChildItem page={pageNoHref} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.queryByText('No link')).not.toBeInTheDocument();
    });
});

describe('DynamicPageDesktopDropdown', () => {
    it('opens and closes dropdown, handles outside click', () => {
        const page = { ...basePage, children: [] };
        render(<DynamicPageDesktopDropdown page={page} />);
        const trigger = screen.getByRole('button');
        expect(trigger).toBeInTheDocument();
        fireEvent.click(trigger);
        expect(screen.getByText('Link 1')).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Link 1')).not.toBeInTheDocument();
    });

    it('closes on item click', () => {
        const page = { ...basePage, children: [] };
        render(<DynamicPageDesktopDropdown page={page} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Link 1'));
        expect(screen.queryByText('Link 1')).not.toBeInTheDocument();
    });

    it('renders children pages recursively', () => {
        render(<DynamicPageDesktopDropdown page={basePage} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Child Page')).toBeInTheDocument();
    });

    it('handles page with no content gracefully', () => {
        const emptyPage: NavbarPage = { id: 'e', name: 'Empty', items: [], children: [] };
        render(<DynamicPageDesktopDropdown page={emptyPage} />);
        expect(screen.getByText('Empty')).toBeInTheDocument();
        // no button because no content, just a span
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});

describe('MobileDynamicPageDropdown', () => {
    const onNavigate = jest.fn();

    it('renders and toggles', () => {
        render(<MobileDynamicPageDropdown page={basePage} onNavigate={onNavigate} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Link 1')).toBeInTheDocument();
    });

    it('calls onNavigate on link click', () => {
        render(<MobileDynamicPageDropdown page={basePage} onNavigate={onNavigate} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Link 1'));
        expect(onNavigate).toHaveBeenCalled();
    });

    it('renders static display if no content', () => {
        const empty: NavbarPage = { id: 'e', name: 'Empty', items: [], children: [] };
        render(<MobileDynamicPageDropdown page={empty} onNavigate={onNavigate} />);
        expect(screen.getByText('Empty')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});