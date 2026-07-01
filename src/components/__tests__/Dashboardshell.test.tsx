import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardShell from '@/components/dashboard-shell';

// Track what props DashboardSidebar receives across renders
const sidebarPropCapture = jest.fn();

jest.mock('@/components/dashboard-sidebar', () => {
    function SidebarMock({ collapsed, onToggle, role }: {
        collapsed: boolean;
        onToggle: () => void;
        role?: string | null;
    }) {
        sidebarPropCapture({ collapsed, role });
        return (
            <div data-testid="sidebar" data-collapsed={String(collapsed)} data-role={role ?? ''}>
                <button onClick={onToggle} data-testid="toggle-btn">Toggle</button>
            </div>
        );
    }
    SidebarMock.displayName = 'SidebarMock';
    return SidebarMock;
});

const mockUseIsMobile = jest.fn();
jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: () => mockUseIsMobile(),
}));

jest.mock('@/lib/utils', () => ({
    cn: (...classes: (string | boolean | undefined)[]) =>
        classes.filter(Boolean).join(' '),
}));

describe('DashboardShell', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('desktop (isMobile = false)', () => {
        beforeEach(() => {
            mockUseIsMobile.mockReturnValue(false);
        });

        it('renders children', () => {
            render(
                <DashboardShell>
                    <p>Page content</p>
                </DashboardShell>
            );
            expect(screen.getByText('Page content')).toBeInTheDocument();
        });

        it('renders the sidebar', () => {
            render(<DashboardShell><div /></DashboardShell>);
            expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        });

        it('passes role prop to sidebar', () => {
            render(<DashboardShell role="admin"><div /></DashboardShell>);
            expect(screen.getByTestId('sidebar').dataset.role).toBe('admin');
        });

        it('starts expanded (collapsed=false) on desktop', () => {
            render(<DashboardShell><div /></DashboardShell>);
            expect(screen.getByTestId('sidebar').dataset.collapsed).toBe('false');
        });

        it('toggles to collapsed when toggle button is clicked', () => {
            render(<DashboardShell><div /></DashboardShell>);
            expect(screen.getByTestId('sidebar').dataset.collapsed).toBe('false');
            fireEvent.click(screen.getByTestId('toggle-btn'));
            expect(screen.getByTestId('sidebar').dataset.collapsed).toBe('true');
        });

        it('toggles back to expanded on second click', () => {
            render(<DashboardShell><div /></DashboardShell>);
            fireEvent.click(screen.getByTestId('toggle-btn'));
            fireEvent.click(screen.getByTestId('toggle-btn'));
            expect(screen.getByTestId('sidebar').dataset.collapsed).toBe('false');
        });

        it('applies md:ml-64 to main when expanded', () => {
            const { container } = render(<DashboardShell><div /></DashboardShell>);
            const main = container.querySelector('main');
            expect(main?.className).toContain('md:ml-64');
        });

        it('applies md:ml-16 to main when collapsed', () => {
            const { container } = render(<DashboardShell><div /></DashboardShell>);
            fireEvent.click(screen.getByTestId('toggle-btn'));
            const main = container.querySelector('main');
            expect(main?.className).toContain('md:ml-16');
        });
    });

    describe('mobile (isMobile = true)', () => {
        beforeEach(() => {
            mockUseIsMobile.mockReturnValue(true);
        });

        it('forces collapsed=true on mobile regardless of toggle', () => {
            render(<DashboardShell><div /></DashboardShell>);
            expect(screen.getByTestId('sidebar').dataset.collapsed).toBe('true');
        });

        it('stays collapsed even after toggle click on mobile', () => {
            render(<DashboardShell><div /></DashboardShell>);
            fireEvent.click(screen.getByTestId('toggle-btn'));
            // isMobile overrides user preference
            expect(screen.getByTestId('sidebar').dataset.collapsed).toBe('true');
        });

        it('does not apply ml margin classes on mobile', () => {
            const { container } = render(<DashboardShell><div /></DashboardShell>);
            const main = container.querySelector('main');
            expect(main?.className).not.toContain('md:ml-64');
            expect(main?.className).not.toContain('md:ml-16');
        });

        it('still renders children on mobile', () => {
            render(
                <DashboardShell>
                    <span>Mobile content</span>
                </DashboardShell>
            );
            expect(screen.getByText('Mobile content')).toBeInTheDocument();
        });
    });

    describe('role prop forwarding', () => {
        beforeEach(() => {
            mockUseIsMobile.mockReturnValue(false);
        });

        it('passes null role to sidebar', () => {
            render(<DashboardShell role={null}><div /></DashboardShell>);
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: null })
            );
        });

        it('passes superadmin role to sidebar', () => {
            render(<DashboardShell role="superadmin"><div /></DashboardShell>);
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'superadmin' })
            );
        });

        it('passes undefined role when not provided', () => {
            render(<DashboardShell><div /></DashboardShell>);
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: undefined })
            );
        });
    });
});