// data-table.test.tsx
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColumnDef } from '@tanstack/react-table';

jest.mock('lucide-react', () => ({
    ChevronDown: (props: React.SVGProps<SVGSVGElement>) =>
        React.createElement('svg', { 'data-testid': 'chev', ...props }),
}));

jest.mock('@/components/ui/button', () => ({
    __esModule: true,
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props} />
    ),
}));

jest.mock('@/components/ui/input', () => ({
    __esModule: true,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input {...props} />
    ),
}));

jest.mock('@/components/ui/table', () => ({
    __esModule: true,
    Table: (p: React.HTMLAttributes<HTMLTableElement>) => <table {...p} />,
    TableHeader: (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />,
    TableBody: (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />,
    TableRow: (p: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...p} />,
    TableHead: (p: React.ThHTMLAttributes<HTMLTableCellElement>) => <th {...p} />,
    TableCell: (p: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} />,
}));

// Mock dropdown (no require, no any)
jest.mock('@/components/ui/dropdown-menu', () => {
    const ReactNS = React; // use imported React (factory isn't hoisted)
    type Ctx = { open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>> };
    const Ctx = ReactNS.createContext<Ctx | null>(null);

    const DropdownMenu: React.FC<React.PropsWithChildren> = ({ children }) => {
        const [open, setOpen] = ReactNS.useState(false);
        return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
    };

    const DropdownMenuTrigger: React.FC<
        React.PropsWithChildren<{ asChild?: boolean }>
    > = ({ children }) => {
        const ctx = ReactNS.useContext(Ctx)!;
        const child = ReactNS.Children.only(children) as React.ReactElement<
            React.ComponentPropsWithoutRef<'button'>
        >;
        const childProps = child.props;
        return ReactNS.cloneElement(child, {
            ...childProps,
            onClick: (e: React.MouseEvent) => {
                childProps.onClick?.(e);
                ctx.setOpen((v) => !v);
            },
        });
    };

    const DropdownMenuContent: React.FC<
        React.PropsWithChildren<{ align?: 'start' | 'center' | 'end' }>
    > = ({ children }) => {
        const ctx = ReactNS.useContext(Ctx)!;
        return ctx.open ? <div role="menu">{children}</div> : null;
    };

    const DropdownMenuCheckboxItem: React.FC<
        React.PropsWithChildren<{
            checked?: boolean;
            onCheckedChange?: (v: boolean) => void;
            className?: string;
        }>
    > = ({ children, checked, onCheckedChange }) => (
        <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={!!checked}
            onClick={() => onCheckedChange?.(!checked)}
        >
            {children}
        </button>
    );

    return {
        __esModule: true,
        DropdownMenu,
        DropdownMenuTrigger,
        DropdownMenuContent,
        DropdownMenuCheckboxItem,
    };
});

import { DataTable } from '../data-table';

type User = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    banned: boolean;
};

const resizeTo = async (w: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
    await act(async () => {
        window.dispatchEvent(new Event('resize'));
    });
};

const columns: ColumnDef<User, unknown>[] = [
    {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
            <input
                type="checkbox"
                aria-label={`select ${row.original.email}`}
                checked={row.getIsSelected()}
                onChange={() => row.toggleSelected()}
            />
        ),
        enableSorting: false,
        enableHiding: true,
    },
    { accessorKey: 'name', header: 'Name', cell: (info) => String(info.getValue()) },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => String(info.getValue()),
        filterFn: (row, id, value) => {
            const v = String(row.getValue(id) ?? '').toLowerCase();
            const f = String(value ?? '').toLowerCase();
            return v.includes(f);
        },
    },
    {
        accessorKey: 'emailVerified',
        header: 'Email Verified',
        cell: (info) => (info.getValue() ? 'Yes' : 'No'),
    },
    {
        accessorKey: 'banned',
        header: 'Banned',
        cell: (info) => (info.getValue() ? 'Yes' : 'No'),
    },
];

const users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com', emailVerified: true, banned: false },
    { id: '2', name: 'Bob', email: 'bob@example.com', emailVerified: false, banned: false },
    { id: '3', name: 'Charlie', email: 'charlie@example.com', emailVerified: true, banned: true },
];

const manyUsers = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    return {
        id: String(n),
        name: `User ${n}`,
        email: `user${n}@example.com`,
        emailVerified: n % 2 === 0,
        banned: n % 3 === 0,
    } satisfies User;
});

beforeEach(async () => {
    await resizeTo(1024);
});

describe('DataTable', () => {
    test('renders headers, rows, and selection summary', () => {
        render(<DataTable<User, unknown> data={users} columns={columns} />);

        expect(screen.getByRole('columnheader', { name: 'Select' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        // Exact match to avoid matching "Email Verified"
        expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Email Verified' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Banned' })).toBeInTheDocument();

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();

        expect(screen.getByText(/0 of 3 row\(s\) selected\./i)).toBeInTheDocument();
    });

    test('filters by email', async () => {
        const user = userEvent.setup();
        render(<DataTable<User, unknown> data={users} columns={columns} />);

        const input = screen.getByPlaceholderText(/filter emails/i);
        await user.clear(input);
        await user.type(input, 'bob');

        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.queryByText('Charlie')).not.toBeInTheDocument();

        await user.clear(input);
        await user.type(input, 'nomatch');
        expect(screen.getByText(/no results\./i)).toBeInTheDocument();
    });

    test('responsive: hides select/emailVerified/banned on small screens', async () => {
        await resizeTo(500);
        render(<DataTable<User, unknown> data={users} columns={columns} />);

        expect(screen.queryByRole('columnheader', { name: 'Select' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Email Verified' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Banned' })).not.toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();

        await resizeTo(800);
        await waitFor(() =>
            expect(screen.getByRole('columnheader', { name: 'Select' })).toBeInTheDocument()
        );
        expect(screen.getByRole('columnheader', { name: 'Email Verified' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Banned' })).toBeInTheDocument();
    });

    test('pagination: next/previous', async () => {
        const user = userEvent.setup();
        render(<DataTable<User, unknown> data={manyUsers} columns={columns} />);

        const nextBtn = screen.getByRole('button', { name: /next/i });
        const prevBtn = screen.getByRole('button', { name: /previous/i });

        expect(prevBtn).toBeDisabled();
        expect(nextBtn).toBeEnabled();

        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.getByText('User 10')).toBeInTheDocument();
        expect(screen.queryByText('User 11')).not.toBeInTheDocument();

        await user.click(nextBtn);

        await waitFor(() => expect(prevBtn).toBeEnabled());
        expect(nextBtn).toBeDisabled();
        expect(screen.queryByText('User 1')).not.toBeInTheDocument();
        expect(screen.getByText('User 11')).toBeInTheDocument();
        expect(screen.getByText('User 12')).toBeInTheDocument();
    });

    test('dropdown renders and exposes checkbox items (mocked)', async () => {
        const user = userEvent.setup();
        render(<DataTable<User, unknown> data={users} columns={columns} />);

        await user.click(screen.getByRole('button', { name: /columns/i }));
        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();

        const selectItem = within(menu).getByRole('menuitemcheckbox', { name: /select/i });
        expect(selectItem).toHaveAttribute('aria-checked', 'true');

        await user.click(selectItem);
    });
});