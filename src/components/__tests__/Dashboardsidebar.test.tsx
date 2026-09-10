import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardSidebar from '@/components/dashboard-sidebar';

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(() => '/dashboard'),
    useRouter: jest.fn(() => ({ push: jest.fn() })),
}));
jest.mock('@/lib/auth-client', () => ({
    authClient: { signOut: jest.fn() },
}));
jest.mock('next/link', () => {
    function LinkMock({ children, href, className, title }: React.PropsWithChildren<{
        href: string; className?: string; title?: string;
    }>) {
        return <a href={href} className={className} title={title}>{children}</a>;
    }
    LinkMock.displayName = 'LinkMock';
    return LinkMock;
});
jest.mock('lucide-react', () => {
    const icon = (name: string) => {
        function Icon({ className }: { className?: string }) {
            return <span data-testid={`icon-${name}`} className={className} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    return {
        LayoutDashboardIcon: icon('LayoutDashboard'),
        UserIcon: icon('User'),
        PenSquareIcon: icon('PenSquare'),
        FolderPlusIcon: icon('FolderPlus'),
        FolderIcon: icon('Folder'),
        MessageSquareIcon: icon('MessageSquare'),
        SettingsIcon: icon('Settings'),
        LogOutIcon: icon('LogOut'),
        UsersIcon: icon('Users'),
        CheckSquareIcon: icon('CheckSquare'),
        ShieldIcon: icon('Shield'),
        BarChart3Icon: icon('BarChart3'),
        ScrollTextIcon: icon('ScrollText'),
        FlagIcon: icon('Flag'),
        ChevronLeftIcon: icon('ChevronLeft'),
        ChevronRightIcon: icon('ChevronRight'),
        FileTextIcon: icon('FileText'),
        BellIcon: icon('Bell'),
    };
});

const { usePathname, useRouter } = jest.requireMock('next/navigation');

describe('DashboardSidebar', () => {
    const mockPush = jest.fn();
    const onToggle = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        usePathname.mockReturnValue('/dashboard');
        useRouter.mockReturnValue({ push: mockPush });
    });

    describe('role-based navigation sections', () => {
        it('renders user sections for undefined role', () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Protocols')).toBeInTheDocument();
            expect(screen.getByText('Notifications')).toBeInTheDocument();
            expect(screen.getByText('Feeds')).toBeInTheDocument();
            expect(screen.getByText('Submit Protocol')).toBeInTheDocument();
            expect(screen.getByText('My Profile')).toBeInTheDocument();
            expect(screen.getByText('Settings')).toBeInTheDocument();
            // user sections should NOT have admin items
            expect(screen.queryByText('User Management')).not.toBeInTheDocument();
        });

        it('renders admin sections for admin role', () => {
            render(<DashboardSidebar role="admin" collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText('User Management')).toBeInTheDocument();
            expect(screen.getByText('Protocol Review')).toBeInTheDocument();
            expect(screen.getByText('Feed Moderation')).toBeInTheDocument();
            expect(screen.getByText('Manage Pages')).toBeInTheDocument();
            expect(screen.getByText('Reports')).toBeInTheDocument();
            expect(screen.getByText('Audit Logs')).toBeInTheDocument();
            // no Analytics section for admin
            expect(screen.queryByText('Platform Stats')).not.toBeInTheDocument();
        });

        it('renders superadmin sections including Analytics', () => {
            render(<DashboardSidebar role="superadmin" collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText('Platform Stats')).toBeInTheDocument();
            expect(screen.getByText('User Management')).toBeInTheDocument();
        });

        it('renders section titles when not collapsed', () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText('Main')).toBeInTheDocument();
            expect(screen.getByText('Actions')).toBeInTheDocument();
            expect(screen.getByText('Account')).toBeInTheDocument();
        });

        it('hides section titles when collapsed', () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.queryByText('Main')).not.toBeInTheDocument();
            expect(screen.queryByText('Actions')).not.toBeInTheDocument();
        });
    });

    describe('collapsed state', () => {
        it('hides label text when collapsed', () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            // spans with text are not rendered when collapsed — links exist but no span text
            expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
        });

        it('shows label text when expanded', () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });

        it('renders ChevronRight icon when collapsed', () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.getByTestId('icon-ChevronRight')).toBeInTheDocument();
        });

        it('renders ChevronLeft icon when expanded', () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByTestId('icon-ChevronLeft')).toBeInTheDocument();
        });

        it('calls onToggle when the toggle button is clicked', () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            fireEvent.click(screen.getByTestId('icon-ChevronLeft').closest('button')!);
            expect(onToggle).toHaveBeenCalledTimes(1);
        });
    });

    describe('active link highlighting', () => {
        it('applies active class to current path link', () => {
            usePathname.mockReturnValue('/dashboard');
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const dashboardLink = screen.getByText('Dashboard').closest('a');
            expect(dashboardLink?.className).toContain('bg-blue-600');
        });

        it('does not apply active class to other links', () => {
            usePathname.mockReturnValue('/dashboard');
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const feedsLink = screen.getByText('Feeds').closest('a');
            expect(feedsLink?.className).not.toContain('bg-blue-600');
        });

        it('activates nested paths via startsWith', () => {
            usePathname.mockReturnValue('/protocols/submit');
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const protocolsLink = screen.getByText('Protocols').closest('a');
            expect(protocolsLink?.className).toContain('bg-blue-600');
        });
    });

    describe('logout', () => {
        it('calls signOut and redirects on logout click', async () => {
            const { authClient } = jest.requireMock('@/lib/auth-client');
            authClient.signOut.mockResolvedValueOnce(undefined);
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            fireEvent.click(screen.getByText('Logout'));
            expect(authClient.signOut).toHaveBeenCalledTimes(1);
        });

        it('shows Logout text when expanded', () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        it('hides Logout text when collapsed', () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.queryByText('Logout')).not.toBeInTheDocument();
        });
    });

    describe('aside width classes', () => {
        it('has w-64 class when expanded', () => {
            const { container } = render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const aside = container.querySelector('aside');
            expect(aside?.className).toContain('w-64');
        });

        it('has w-16 class when collapsed', () => {
            const { container } = render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            const aside = container.querySelector('aside');
            expect(aside?.className).toContain('w-16');
        });
    });
});