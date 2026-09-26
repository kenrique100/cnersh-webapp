import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NavbarMobileMenu from '../NavbarMobileMenu';


// next/link — the component uses `import Link from "next/link"` (default import)
jest.mock('next/link', () => {
    const LinkMock = ({
                          children,
                          href,
                          onClick,
                          className,
                      }: {
        children: React.ReactNode;
        href: string;
        onClick?: () => void;
        className?: string;
    }) => (
        <a href={href} onClick={onClick} className={className}>
            {children}
        </a>
    );
    LinkMock.displayName = 'LinkMock';
    return { __esModule: true, default: LinkMock };
});

// cn utility — avoid `any`
jest.mock('@/lib/utils', () => ({
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Radix Sheet primitives
jest.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="sheet-content">{children}</div>
    ),
    SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Button — strip variant/size so they don't leak into the DOM
jest.mock('@/components/ui/button', () => ({
    Button: function ButtonMock({
                                    children,
                                    variant,
                                    size,
                                    ...props
                                }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        children: React.ReactNode;
        variant?: string;
        size?: string;
    }) {
        // Swallow non-HTML props so they don't leak into the DOM
        void variant;
        void size;
        return <button {...props}>{children}</button>;
    },
}));

// UserAvatar — default export
jest.mock('@/components/user-avatar', () => ({
    __esModule: true,
    default: ({ name }: { name?: string }) => (
        <span data-testid="user-avatar">{name}</span>
    ),
}));

// lucide-react icons
jest.mock('lucide-react', () => ({
    MenuIcon: () => <span data-testid="menu-icon" />,
    LogOutIcon: () => <span data-testid="logout-icon" />,
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

// Child dropdown components (all mocked to simple markers)
jest.mock('../NavbarOurPagesDropdown', () => ({
    OurPagesDropdown: () => <div data-testid="our-pages-dropdown" />,
}));
jest.mock('../NavbarResourcesDropdown', () => ({
    ResourcesMobileDropdown: () => <div data-testid="resources-mobile" />,
}));
jest.mock('../NavbarEthicalClearanceDropdown', () => ({
    EthicalClearanceMobileDropdown: () => <div data-testid="ethical-mobile" />,
}));
jest.mock('../NavbarSOPsDropdown', () => ({
    SOPsDropdown: () => <div data-testid="sops-dropdown" />,
}));
jest.mock('../NavbarDynamicPageDropdown', () => ({
    MobileDynamicPageDropdown: ({ page }: { page: { name: string } }) => (
        <div data-testid={`dynamic-page-${page.name}`}>{page.name}</div>
    ),
}));

// NavbarLanguageSwitcher — default export
jest.mock('../NavbarLanguageSwitcher', () => {
    function LangSwitcherMock() {
        return <div data-testid="lang-switcher" />;
    }
    LangSwitcherMock.displayName = 'LangSwitcherMock';
    return { __esModule: true, default: LangSwitcherMock };
});

type MobileMenuProps = React.ComponentProps<typeof NavbarMobileMenu>;
type NavbarUser = NonNullable<MobileMenuProps['user']>;

// Match the shape the component reads: name, email, image, gender, role
const baseUser = {
    name: 'John Doe',
    email: 'john@example.com',
    image: null,
    gender: 'male',
    role: 'user',
} as unknown as NavbarUser;

const adminUser = {
    ...baseUser,
    role: 'admin',
} as unknown as NavbarUser;

const superAdminUser = {
    ...baseUser,
    role: 'superadmin',
} as unknown as NavbarUser;

const defaultPages = [
    { id: 'p1', name: 'Dynamic Page', items: [], children: [] },
] as unknown as MobileMenuProps['pages'];

const buildProps = (
    overrides: Partial<MobileMenuProps> = {}
): MobileMenuProps => ({
    user: baseUser,
    isAdmin: false,
    notificationCount: 5,
    pathname: '/dashboard',
    pages: defaultPages,
    handleSignOut: jest.fn().mockResolvedValue(undefined),
    open: true,
    onOpenChange: jest.fn(),
    ...overrides,
});

describe('NavbarMobileMenu', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Sheet shell', () => {
        it('renders the trigger button with the menu icon', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
        });

        it('renders the sheet content', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
        });
    });

    describe('Authenticated user (regular)', () => {
        it('renders the user avatar and header info', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            // Avatar shows the name
            expect(screen.getByTestId('user-avatar')).toHaveTextContent('John Doe');
            // The name appears twice: once in the avatar, once in the header <p>
            expect(screen.getAllByText('John Doe')).toHaveLength(2);
            // Email rendered in the header
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
        });

        it('renders all regular user navigation items', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            const items = [
                'Dashboard',
                'Protocols',
                'Community',
                'Notifications',
                'Feeds',
                'Submit Protocol',
                'My Profile',
                'Settings',
            ];
            items.forEach((label) =>
                expect(screen.getByText(label)).toBeInTheDocument()
            );
        });

        it('does not render admin-only items', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.queryByText('User Management')).not.toBeInTheDocument();
            expect(screen.queryByText('Protocol Review')).not.toBeInTheDocument();
            expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
        });

        it('does not render the Admin badge', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.queryByText('Admin')).not.toBeInTheDocument();
            expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
        });

        it('renders the Logout button', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        it('calls handleSignOut when Logout is clicked', () => {
            const handleSignOut = jest.fn().mockResolvedValue(undefined);
            render(<NavbarMobileMenu {...buildProps({ handleSignOut })} />);
            fireEvent.click(screen.getByText('Logout'));
            expect(handleSignOut).toHaveBeenCalledTimes(1);
        });

        it('renders the language switcher', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
        });

        it('renders all top-level dropdowns', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(screen.getByTestId('our-pages-dropdown')).toBeInTheDocument();
            expect(screen.getByTestId('resources-mobile')).toBeInTheDocument();
            expect(screen.getByTestId('ethical-mobile')).toBeInTheDocument();
            expect(screen.getByTestId('sops-dropdown')).toBeInTheDocument();
        });

        it('renders dynamic pages from the pages prop', () => {
            render(<NavbarMobileMenu {...buildProps()} />);
            expect(
                screen.getByTestId('dynamic-page-Dynamic Page')
            ).toBeInTheDocument();
        });
    });

    describe('Active link highlighting', () => {
        it('applies active styling to the link matching pathname', () => {
            render(<NavbarMobileMenu {...buildProps({ pathname: '/dashboard' })} />);
            const link = screen.getByText('Dashboard').closest('a')!;
            // Active class signature is exactly "bg-blue-50 text-blue-700"
            expect(link.className).toMatch(/bg-blue-50 text-blue-700/);
        });

        it('does not apply active styling to non-matching links', () => {
            render(<NavbarMobileMenu {...buildProps({ pathname: '/dashboard' })} />);
            const link = screen.getByText('Protocols').closest('a')!;
            // Inactive links contain "hover:bg-blue-50" but NOT "bg-blue-50 text-blue-700"
            expect(link.className).not.toMatch(/bg-blue-50 text-blue-700/);
        });
    });

    describe('Notification badge', () => {
        it('shows the count when > 0', () => {
            render(<NavbarMobileMenu {...buildProps({ notificationCount: 5 })} />);
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('caps the count at "99+" when above 99', () => {
            render(<NavbarMobileMenu {...buildProps({ notificationCount: 250 })} />);
            expect(screen.getByText('99+')).toBeInTheDocument();
        });

        it('renders no badge when count is 0', () => {
            render(<NavbarMobileMenu {...buildProps({ notificationCount: 0 })} />);
            expect(screen.queryByText('0')).not.toBeInTheDocument();
            expect(screen.queryByText('99+')).not.toBeInTheDocument();
        });
    });

    describe('Admin user', () => {
        it('renders the Admin badge when role is admin', () => {
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: adminUser, isAdmin: true })}
                />
            );
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        it('renders the Super Admin badge when role is superadmin', () => {
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: superAdminUser, isAdmin: true })}
                />
            );
            expect(screen.getByText('Super Admin')).toBeInTheDocument();
        });

        it('renders admin-only navigation items', () => {
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: adminUser, isAdmin: true })}
                />
            );
            const items = [
                'User Management',
                'Protocol Review',
                'Feed Moderation',
                'Community Mod.',
                'Manage Pages',
                'Reports',
                'Audit Logs',
            ];
            items.forEach((label) =>
                expect(screen.getByText(label)).toBeInTheDocument()
            );
        });

        it('does not render the user-only "Submit Protocol" item', () => {
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: adminUser, isAdmin: true })}
                />
            );
            expect(screen.queryByText('Submit Protocol')).not.toBeInTheDocument();
        });

        it('points the Dashboard link to /admin for admins', () => {
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: adminUser, isAdmin: true })}
                />
            );
            const dashboardLink = screen.getByText('Dashboard').closest('a')!;
            expect(dashboardLink).toHaveAttribute('href', '/admin');
        });
    });

    describe('Unauthenticated user', () => {
        it('renders Sign In and Sign Up buttons', () => {
            render(<NavbarMobileMenu {...buildProps({ user: null })} />);
            expect(screen.getByText('Sign In')).toBeInTheDocument();
            expect(screen.getByText('Sign Up')).toBeInTheDocument();
        });

        it('does not render the Logout button', () => {
            render(<NavbarMobileMenu {...buildProps({ user: null })} />);
            expect(screen.queryByText('Logout')).not.toBeInTheDocument();
        });

        it('does not render any nav items', () => {
            render(<NavbarMobileMenu {...buildProps({ user: null })} />);
            expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
            expect(screen.queryByText('Protocols')).not.toBeInTheDocument();
        });

        it('still renders the top-level dropdowns', () => {
            render(<NavbarMobileMenu {...buildProps({ user: null })} />);
            expect(screen.getByTestId('our-pages-dropdown')).toBeInTheDocument();
            expect(screen.getByTestId('resources-mobile')).toBeInTheDocument();
            expect(screen.getByTestId('ethical-mobile')).toBeInTheDocument();
            expect(screen.getByTestId('sops-dropdown')).toBeInTheDocument();
        });

        it('still renders the language switcher', () => {
            render(<NavbarMobileMenu {...buildProps({ user: null })} />);
            expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
        });

        it('calls onOpenChange(false) when Sign In is clicked', () => {
            const onOpenChange = jest.fn();
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: null, onOpenChange })}
                />
            );
            fireEvent.click(screen.getByText('Sign In'));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });

        it('calls onOpenChange(false) when Sign Up is clicked', () => {
            const onOpenChange = jest.fn();
            render(
                <NavbarMobileMenu
                    {...buildProps({ user: null, onOpenChange })}
                />
            );
            fireEvent.click(screen.getByText('Sign Up'));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Sheet closing behaviour', () => {
        it('closes sheet when a navigation link is clicked', () => {
            const onOpenChange = jest.fn();
            render(<NavbarMobileMenu {...buildProps({ onOpenChange })} />);
            fireEvent.click(screen.getByText('Dashboard'));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });

        it('closes sheet when the notification link is clicked', () => {
            const onOpenChange = jest.fn();
            render(<NavbarMobileMenu {...buildProps({ onOpenChange })} />);
            fireEvent.click(screen.getByText('Notifications'));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Edge cases', () => {
        it('renders "User" fallback when name is empty', () => {
            const namelessUser = {
                ...baseUser,
                name: '',
            } as unknown as NavbarUser;
            render(<NavbarMobileMenu {...buildProps({ user: namelessUser })} />);
            expect(screen.getByText('User')).toBeInTheDocument();
        });

        it('renders no dynamic pages when pages is empty', () => {
            render(<NavbarMobileMenu {...buildProps({ pages: [] })} />);
            expect(
                screen.queryByTestId('dynamic-page-Dynamic Page')
            ).not.toBeInTheDocument();
        });
    });
});