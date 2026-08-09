import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SOPsDropdown } from '../NavbarSOPsDropdown';
import SOPsDesktopSubmenuNav from '../NavbarSOPsDropdown';

// Mock lucide-react icons with named components
jest.mock('lucide-react', () => {
    function ChevronDownIconMock() {
        return <span data-testid="chevron" />;
    }
    ChevronDownIconMock.displayName = 'ChevronDownIconMock';

    function ClipboardListIconMock() {
        return <span data-testid="clipboard" />;
    }
    ClipboardListIconMock.displayName = 'ClipboardListIconMock';

    function DownloadIconMock() {
        return <span data-testid="download" />;
    }
    DownloadIconMock.displayName = 'DownloadIconMock';

    return {
        ChevronDownIcon: ChevronDownIconMock,
        ClipboardListIcon: ClipboardListIconMock,
        DownloadIcon: DownloadIconMock,
    };
});

describe('SOPsDropdown (mobile)', () => {
    it('nested expansion', () => {
        render(<SOPsDropdown onNavigate={jest.fn()} />);
        fireEvent.click(screen.getByText("SOP's"));
        fireEvent.click(screen.getByText('English'));
        // Only English SOP 1 is visible
        expect(screen.getByText('SOP 1')).toBeInTheDocument();
        expect(screen.getByText('SOP 2')).toBeInTheDocument();
    });
});

describe('SOPsDesktopSubmenuNav', () => {
    it('renders and closes on outside click', () => {
        render(<SOPsDesktopSubmenuNav />);
        fireEvent.click(screen.getByText("SOP's"));
        // Desktop shows both English and French SOP 1 links
        const sop1Links = screen.getAllByText('SOP 1');
        expect(sop1Links.length).toBe(2);

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('SOP 1')).not.toBeInTheDocument();
    });
});