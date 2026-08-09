import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NavbarMobileMenu from '../NavbarMobileMenu';

jest.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
    useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/lib/auth-client', () => ({
    authClient: { signOut: jest.fn() },
}));
jest.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div>{children}</div> : null,
    SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
        <button {...props}>{children}</button>
    ),
}));
jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarImage: () => null,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
jest.mock('lucide-react', () => ({
    MenuIcon: () => <span data-testid="menu" />,
    LogOutIcon: () => <span />,
    LayoutDashboardIcon: () => <span />,
    FolderIcon: () => <span />,
    MessageSquareIcon: () => <span />,
    BellIcon: () => <span />,
    PenSquareIcon: () => <span />,
    FolderPlusIcon: () => <span />,
    UserIcon: () => <span />,
    SettingsIcon: () => <span />,
    UsersIcon: () => <span />,
    CheckSquareIcon: () => <span />,
    ShieldIcon: () => <span />,
    FileTextIcon: () => <span />,
    FlagIcon: () => <span />,
    ScrollTextIcon: () => <span />,
    ChevronDownIcon: () => <span />,
}));
jest.mock('../NavbarOurPagesDropdown', () => ({
    OurPagesDropdown: () => <div data-testid="our-pages-dropdown" />,
}));
jest.mock('../NavbarResourcesDropdown', () => ({
    ResourcesMobileDropdown: () => <div data-testid="resources-mobile" />,
}));
jest.mock('../NavbarEthicalClearanceDropdown', () => ({
    EthicalClearanceMobileDropdown: () => <div data-testid="ethical-mobile" />,
}));
jest.mock('../NavbarDynamicPageDropdown', () => ({
    MobileDynamicPageDropdown: ({ page }: { page: { name: string } }) => <div>{page.name}</div>,
}));
jest.mock('../NavbarLanguageSwitcher', () => {
    function LangSwitcherMock() { return <div data-testid="lang-switcher" />; }
    LangSwitcherMock.displayName = 'LangSwitcherMock';
    return LangSwitcherMock;
});

const defaultProps = {
    user: { name: 'John Doe', email: 'john@example.com', image: null },
    userInitials: 'JD',
    isAdmin: false,
    notificationCount: 5,
    pathname: '/dashboard',
    pages: [{ id: 'p1', name: 'Dynamic Page', items: [], children: [] }],
    handleSignOut: jest.fn(),
    open: true,
    onOpenChange: jest.fn(),
};

describe('NavbarMobileMenu', () => {
    beforeEach(() => {
        defaultProps.handleSignOut.mockClear();
        defaultProps.onOpenChange.mockClear();
    });

    it('renders user info and nav items', () => {
        render(<NavbarMobileMenu {...defaultProps} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders admin items when isAdmin', () => {
        render(
            <NavbarMobileMenu
                {...defaultProps}
                isAdmin
                user={{ ...defaultProps.user, role: 'admin' }}
            />
        );
        expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('shows login buttons when user is null', () => {
        render(<NavbarMobileMenu {...defaultProps} user={null} />);
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('calls handleSignOut on logout click', () => {
        render(<NavbarMobileMenu {...defaultProps} />);
        fireEvent.click(screen.getByText('Logout'));
        expect(defaultProps.handleSignOut).toHaveBeenCalled();
    });

    it('closes sheet on link click', () => {
        render(<NavbarMobileMenu {...defaultProps} />);
        fireEvent.click(screen.getByText('Dashboard'));
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
});