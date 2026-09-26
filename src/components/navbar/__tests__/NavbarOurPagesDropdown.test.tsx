import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OurPagesDesktopDropdown, {
    OurPagesDropdown,
} from '../NavbarOurPagesDropdown';

jest.mock('next/link', () => {
    const LinkMock = ({
                          children,
                          href,
                          onClick,
                          className,
                      }: React.PropsWithChildren<{
        href: string;
        onClick?: () => void;
        className?: string;
    }>) => (
        <a href={href} onClick={onClick} className={className}>
            {children}
        </a>
    );
    LinkMock.displayName = 'LinkMock';
    return { __esModule: true, default: LinkMock };
});

jest.mock('@/lib/utils', () => ({
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
    ChevronDownIcon: () => <span data-testid="chevron" />,
    FileTextIcon: () => <span data-testid="file-text" />,
    UsersIcon: () => <span data-testid="users" />,
    BuildingIcon: () => <span data-testid="building" />,
    DownloadIcon: () => <span data-testid="download" />,
}));

/** Tokenize a className string for order-agnostic assertions. */
const tokens = (el: Element | null): string[] =>
    (el?.className ?? '').split(/\s+/).filter(Boolean);

describe('OurPagesDropdown (mobile)', () => {
    it('renders the trigger button labelled "Our Pages"', () => {
        render(<OurPagesDropdown pathname="/" onNavigate={jest.fn()} />);
        expect(screen.getByText('Our Pages')).toBeInTheDocument();
    });

    it('is closed by default', () => {
        render(<OurPagesDropdown pathname="/" onNavigate={jest.fn()} />);
        expect(screen.queryByText('About Us')).not.toBeInTheDocument();
        expect(screen.queryByText('Contract Rex Org')).not.toBeInTheDocument();
        expect(screen.queryByText('Article')).not.toBeInTheDocument();
    });

    it('opens and shows all three mobile items (About Us, Contract Rex Org, Article)', () => {
        render(<OurPagesDropdown pathname="/" onNavigate={jest.fn()} />);
        fireEvent.click(screen.getByText('Our Pages'));

        expect(screen.getByText('About Us')).toBeInTheDocument();
        expect(screen.getByText('Contract Rex Org')).toBeInTheDocument();
        expect(screen.getByText('Article')).toBeInTheDocument();
    });

    it('does not render Membership, Evaluation Form, or SOPs', () => {
        render(<OurPagesDropdown pathname="/" onNavigate={jest.fn()} />);
        fireEvent.click(screen.getByText('Our Pages'));

        expect(screen.queryByText('Membership')).not.toBeInTheDocument();
        expect(screen.queryByText('Evaluation Form')).not.toBeInTheDocument();
        expect(screen.queryByText("SOP's")).not.toBeInTheDocument();
        expect(screen.queryByText('SOPs')).not.toBeInTheDocument();
    });

    it('closes when the trigger is clicked twice', () => {
        render(<OurPagesDropdown pathname="/" onNavigate={jest.fn()} />);
        const trigger = screen.getByText('Our Pages');
        fireEvent.click(trigger);
        expect(screen.getByText('About Us')).toBeInTheDocument();

        fireEvent.click(trigger);
        expect(screen.queryByText('About Us')).not.toBeInTheDocument();
    });

    it('calls onNavigate when an item is clicked', () => {
        const onNavigate = jest.fn();
        render(<OurPagesDropdown pathname="/" onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Our Pages'));
        fireEvent.click(screen.getByText('Contract Rex Org'));
        expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigate for each mobile link', () => {
        const onNavigate = jest.fn();
        render(<OurPagesDropdown pathname="/" onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Our Pages'));
        fireEvent.click(screen.getByText('About Us'));
        fireEvent.click(screen.getByText('Article'));
        expect(onNavigate).toHaveBeenCalledTimes(2);
    });

    it('applies active styling for the matching pathname', () => {
        render(
            <OurPagesDropdown pathname="/pages/about" onNavigate={jest.fn()} />
        );
        fireEvent.click(screen.getByText('Our Pages'));
        const cls = tokens(screen.getByText('About Us').closest('a'));
        expect(cls).toContain('bg-blue-50');
        expect(cls).toContain('text-blue-700');
    });

    it('does not apply active styling for non-matching paths', () => {
        render(
            <OurPagesDropdown pathname="/pages/about" onNavigate={jest.fn()} />
        );
        fireEvent.click(screen.getByText('Our Pages'));
        const cls = tokens(screen.getByText('Article').closest('a'));
        // Inactive uses "hover:bg-blue-50" — plain "bg-blue-50" must be absent
        expect(cls).not.toContain('bg-blue-50');
    });

    it('points each link to the correct href', () => {
        render(<OurPagesDropdown pathname="/" onNavigate={jest.fn()} />);
        fireEvent.click(screen.getByText('Our Pages'));

        expect(screen.getByText('About Us').closest('a')).toHaveAttribute(
            'href',
            '/pages/about'
        );
        expect(
            screen.getByText('Contract Rex Org').closest('a')
        ).toHaveAttribute('href', '/pages/contract-rex');
        expect(screen.getByText('Article').closest('a')).toHaveAttribute(
            'href',
            '/pages/article'
        );
    });
});

describe('OurPagesDesktopDropdown', () => {
    it('renders the trigger button', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        expect(screen.getByText('Our Pages')).toBeInTheDocument();
    });

    it('is closed by default', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        expect(screen.queryByText('About Us')).not.toBeInTheDocument();
    });

    it('opens and shows both desktop items (About Us, Contract Rex Org)', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        fireEvent.click(screen.getByText('Our Pages'));

        expect(screen.getByText('About Us')).toBeInTheDocument();
        expect(screen.getByText('Contract Rex Org')).toBeInTheDocument();
    });

    it('does not render Article, Membership, Evaluation Form, or SOPs', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        fireEvent.click(screen.getByText('Our Pages'));

        expect(screen.queryByText('Article')).not.toBeInTheDocument();
        expect(screen.queryByText('Membership')).not.toBeInTheDocument();
        expect(screen.queryByText('Evaluation Form')).not.toBeInTheDocument();
        expect(screen.queryByText("SOP's")).not.toBeInTheDocument();
        expect(screen.queryByText('SOPs')).not.toBeInTheDocument();
    });

    it('closes when a link is clicked', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        fireEvent.click(screen.getByText('Our Pages'));
        fireEvent.click(screen.getByText('About Us'));
        expect(screen.queryByText('Contract Rex Org')).not.toBeInTheDocument();
    });

    it('closes on outside click', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        fireEvent.click(screen.getByText('Our Pages'));
        expect(screen.getByText('About Us')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('About Us')).not.toBeInTheDocument();
    });

    it('toggles aria-expanded on the trigger', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        const trigger = screen.getByText('Our Pages').closest('button')!;
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('highlights the active path on the trigger when on /pages/about', () => {
        render(<OurPagesDesktopDropdown pathname="/pages/about" />);
        const trigger = screen.getByText('Our Pages').closest('button')!;
        expect(tokens(trigger)).toContain('bg-blue-50');
    });

    it('highlights the active path on the trigger when on /pages/contract-rex', () => {
        render(<OurPagesDesktopDropdown pathname="/pages/contract-rex" />);
        const trigger = screen.getByText('Our Pages').closest('button')!;
        expect(tokens(trigger)).toContain('bg-blue-50');
    });

    it('does not apply active trigger styling for unrelated paths', () => {
        render(<OurPagesDesktopDropdown pathname="/somewhere-else" />);
        const trigger = screen.getByText('Our Pages').closest('button')!;
        expect(tokens(trigger)).not.toContain('bg-blue-50');
    });

    it('applies active styling on the matching link', () => {
        render(<OurPagesDesktopDropdown pathname="/pages/about" />);
        fireEvent.click(screen.getByText('Our Pages'));
        const cls = tokens(screen.getByText('About Us').closest('a'));
        // Order-agnostic — desktop renders "text-blue-700 bg-blue-50 …"
        expect(cls).toContain('bg-blue-50');
        expect(cls).toContain('text-blue-700');
    });

    it('points desktop links to the correct hrefs', () => {
        render(<OurPagesDesktopDropdown pathname="/" />);
        fireEvent.click(screen.getByText('Our Pages'));

        expect(screen.getByText('About Us').closest('a')).toHaveAttribute(
            'href',
            '/pages/about'
        );
        expect(
            screen.getByText('Contract Rex Org').closest('a')
        ).toHaveAttribute('href', '/pages/contract-rex');
    });
});