import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OurPagesDropdown } from '../NavbarOurPagesDropdown';
import OurPagesDesktopDropdown from '../NavbarOurPagesDropdown';

jest.mock('next/navigation', () => ({
    usePathname: () => '/pages/about',
}));
jest.mock('next/link', () => {
    function LinkMock({ children, href, onClick, className }: React.PropsWithChildren<{
        href: string;
        onClick?: () => void;
        className?: string;
    }>) {
        return <a href={href} onClick={onClick} className={className}>{children}</a>;
    }
    LinkMock.displayName = 'LinkMock';
    return LinkMock;
});
jest.mock('lucide-react', () => ({
    ChevronDownIcon: () => <span data-testid="chevron" />,
    FileTextIcon: () => <span data-testid="file-text" />,
    UsersIcon: () => <span data-testid="users" />,
    BuildingIcon: () => <span data-testid="building" />,
    DownloadIcon: () => <span data-testid="download" />,
}));
jest.mock('../NavbarSOPsDropdown', () => ({
    SOPsDropdown: () => <div data-testid="sops-dropdown" />,
}));

describe('OurPagesDropdown (mobile)', () => {
    const onNavigate = jest.fn();

    it('toggles and shows links', () => {
        render(<OurPagesDropdown pathname="/pages/about" onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Our Pages'));
        expect(screen.getByText('About Us')).toBeInTheDocument();
        expect(screen.getByText('Contract Rex Org')).toBeInTheDocument();
    });
});

describe('OurPagesDesktopDropdown', () => {
    it('toggles dropdown and closes on outside click', () => {
        render(<OurPagesDesktopDropdown pathname="/pages/about" />);
        fireEvent.click(screen.getByText('Our Pages'));
        expect(screen.getByText('About Us')).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('About Us')).not.toBeInTheDocument();
    });

    it('highlights active path', () => {
        render(<OurPagesDesktopDropdown pathname="/pages/about" />);
        fireEvent.click(screen.getByText('Our Pages'));
        const aboutLink = screen.getByText('About Us').closest('a');
        expect(aboutLink?.className).toContain('text-blue-700');
    });
});