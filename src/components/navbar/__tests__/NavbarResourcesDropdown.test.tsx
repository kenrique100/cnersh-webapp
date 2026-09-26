import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourcesDesktopDropdown, ResourcesMobileDropdown } from '../NavbarResourcesDropdown';

jest.mock('lucide-react', () => {
    function ChevronDownIconMock() {
        return <span data-testid="chevron" />;
    }
    ChevronDownIconMock.displayName = 'ChevronDownIconMock';

    function DownloadIconMock() {
        return <span data-testid="download" />;
    }
    DownloadIconMock.displayName = 'DownloadIconMock';

    function GlobeIconMock() {
        return <span data-testid="globe" />;
    }
    GlobeIconMock.displayName = 'GlobeIconMock';

    function BookOpenIconMock() {
        return <span data-testid="book" />;
    }
    BookOpenIconMock.displayName = 'BookOpenIconMock';

    function FileTextIconMock() {
        return <span data-testid="file-text" />;
    }
    FileTextIconMock.displayName = 'FileTextIconMock';

    return {
        ChevronDownIcon: ChevronDownIconMock,
        DownloadIcon: DownloadIconMock,
        GlobeIcon: GlobeIconMock,
        BookOpenIcon: BookOpenIconMock,
        FileTextIcon: FileTextIconMock,
    };
});

jest.mock(
    'next/link',
    () =>
        function LinkMock({
                              children,
                              ...props
                          }: React.ComponentProps<'a'> & { children: React.ReactNode }) {
            return <a {...props}>{children}</a>;
        }
);

describe('ResourcesDesktopDropdown', () => {
    it('opens and closes', () => {
        render(<ResourcesDesktopDropdown />);
        fireEvent.click(screen.getByText('Resources'));
        expect(screen.getByText('WHO links for training')).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('WHO links for training')).not.toBeInTheDocument();
    });

    it('renders all desktop items including the full Law group', () => {
        render(<ResourcesDesktopDropdown />);
        fireEvent.click(screen.getByText('Resources'));
        expect(screen.getByText('WHO links for training')).toBeInTheDocument();
        expect(screen.getByText('CIOMS')).toBeInTheDocument();
        expect(screen.getByText('Helsinki Declaration')).toBeInTheDocument();
        expect(screen.getByText('Tuskegee Syphilis Trials')).toBeInTheDocument();
        expect(screen.getByText('Law & Research in Cameroon')).toBeInTheDocument();
        expect(screen.getByText('Law on Research on Human Subjects')).toBeInTheDocument();
        expect(screen.getByText('Medical Research')).toBeInTheDocument();
        expect(screen.getByText('Finance Law 2024')).toBeInTheDocument();
        expect(screen.getByText('Data Protection Law')).toBeInTheDocument();
        expect(screen.getByText('Ministerial Decision')).toBeInTheDocument();
    });
});

describe('ResourcesMobileDropdown', () => {
    const onNavigate = jest.fn();

    it('toggles law section', () => {
        render(<ResourcesMobileDropdown onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Resources'));
        fireEvent.click(screen.getByText('Law & Research in Cameroon'));
        expect(screen.getByText('Law on Human Subjects')).toBeInTheDocument();
    });

    it('renders all five law group items on mobile', () => {
        render(<ResourcesMobileDropdown onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Resources'));
        fireEvent.click(screen.getByText('Law & Research in Cameroon'));
        expect(screen.getByText('Law on Human Subjects')).toBeInTheDocument();
        expect(screen.getByText('Medical Research')).toBeInTheDocument();
        expect(screen.getByText('Finance Law 2024')).toBeInTheDocument();
        expect(screen.getByText('Data Protection Law')).toBeInTheDocument();
        expect(screen.getByText('Ministerial Decision')).toBeInTheDocument();
    });

    it('renders top-level items on mobile', () => {
        render(<ResourcesMobileDropdown onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Resources'));
        expect(screen.getByText('WHO links for training')).toBeInTheDocument();
        expect(screen.getByText('CIOMS')).toBeInTheDocument();
        expect(screen.getByText('Helsinki Declaration')).toBeInTheDocument();
        expect(screen.getByText('Tuskegee Syphilis Trials')).toBeInTheDocument();
    });
});