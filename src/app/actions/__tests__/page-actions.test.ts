import type { authSession } from '@/lib/auth-utils';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        user: {},
        page: {},
        pageItem: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';

import {
    getPages,
    createPage,
    updatePage,
    deletePage,
    addPageItem,
    updatePageItem,
    deletePageItem,
} from '@/app/actions/page-actions';

// ── Typed mock references ─────────────────────────────────────────────

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    page: MockTable;
    pageItem: MockTable;
}

const mockedDb = _db as unknown as MockDb;

// ── Helpers ───────────────────────────────────────────────────────────

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.user = mockedDb.user;
    live.page = mockedDb.page;
    live.pageItem = mockedDb.pageItem;
}

function mockSession(userId = 'admin-1', name = 'Admin User'): void {
    mockedAuthSession.mockResolvedValue({
        session: {
            id: 'session-id',
            createdAt: new Date(),
            updatedAt: new Date(),
            userId,
            expiresAt: new Date(Date.now() + 86_400_000),
            token: 'token',
            ipAddress: null,
            userAgent: null,
            impersonatedBy: null,
        },
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@test.com`,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            image: null,
            role: 'admin',
            banned: false,
            banReason: null,
            banExpires: null,
            welcomeEmailSent: false,
            gender: 'male',
            profession: null,
            title: null,
        },
    } as Awaited<ReturnType<typeof authSession>>);
}

/**
 * Sets up an admin or superadmin session and mocks the requireAdmin
 * db.user.findUnique call to return the given role.
 */
function mockAdmin(role: 'admin' | 'superadmin' = 'admin'): void {
    mockSession('admin-1', 'Admin User');
    mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role });
    syncDb();
}

/** Minimal page shape returned by Prisma */
function buildPage(overrides: Partial<{
    id: string;
    name: string;
    parentId: string | null;
    items: object[];
    children: object[];
}> = {}) {
    return {
        id: 'page-1',
        name: 'About',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        children: [],
        ...overrides,
    };
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.user = {};
    mockedDb.page = {};
    mockedDb.pageItem = {};

    syncDb();
});

// ── getPages ──────────────────────────────────────────────────────────

describe('getPages', () => {
    it('returns top-level pages with nested children and items', async () => {
        const fakePages = [
            buildPage({
                id: 'page-1',
                name: 'About',
                items: [{ id: 'item-1', name: 'Mission' }],
                children: [
                    buildPage({ id: 'page-child', name: 'Team', parentId: 'page-1' }),
                ],
            }),
            buildPage({ id: 'page-2', name: 'Research' }),
        ];

        mockedDb.page.findMany = jest.fn().mockResolvedValue(fakePages);
        syncDb();

        const result = await getPages();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('About');
        expect(result[0].children).toHaveLength(1);
    });

    it('queries only root-level pages (parentId: null)', async () => {
        mockedDb.page.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getPages();

        expect(mockedDb.page.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { parentId: null },
            })
        );
    });

    it('orders results by createdAt ascending', async () => {
        mockedDb.page.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getPages();

        expect(mockedDb.page.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { createdAt: 'asc' },
            })
        );
    });

    it('returns empty array without throwing when database errors', async () => {
        mockedDb.page.findMany = jest
            .fn()
            .mockRejectedValue(new Error('DB error'));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await getPages();

        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('does not require authentication', async () => {
        // No session set — getPages should still work
        mockedAuthSession.mockResolvedValue(null);
        mockedDb.page.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        const result = await getPages();
        expect(result).toEqual([]);
    });
});

// ── createPage ────────────────────────────────────────────────────────

describe('createPage', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(
            createPage({ name: 'New Page', items: [] })
        ).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(
            createPage({ name: 'New Page', items: [] })
        ).rejects.toThrow('Forbidden');
    });

    it('throws if page name is empty', async () => {
        mockAdmin();

        await expect(
            createPage({ name: '   ', items: [] })
        ).rejects.toThrow('Page name is required');
    });

    it('creates a root page with no items', async () => {
        mockAdmin();

        const fakePage = buildPage({ id: 'page-new', name: 'Publications', items: [] });
        mockedDb.page.create = jest.fn().mockResolvedValue(fakePage);
        syncDb();

        const result = await createPage({ name: '  Publications  ', items: [] });

        expect(result.name).toBe('Publications');
        expect(mockedDb.page.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Publications',
                    parentId: null,
                    items: { create: [] },
                }),
                include: { items: true },
            })
        );
    });

    it('creates a page with multiple items, trimming strings', async () => {
        mockAdmin();

        const fakePage = buildPage({
            id: 'page-with-items',
            name: 'Resources',
            items: [
                { id: 'i1', name: 'Doc A', url: 'https://example.com', fileUrl: null },
                { id: 'i2', name: 'Doc B', url: null, fileUrl: 'https://file.example.com/b.pdf' },
            ],
        });
        mockedDb.page.create = jest.fn().mockResolvedValue(fakePage);
        syncDb();

        const result = await createPage({
            name: 'Resources',
            items: [
                { name: '  Doc A  ', url: '  https://example.com  ' },
                { name: 'Doc B', fileUrl: 'https://file.example.com/b.pdf' },
            ],
        });

        expect(result.items).toHaveLength(2);
        expect(mockedDb.page.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    items: {
                        create: [
                            { name: 'Doc A', url: 'https://example.com', fileUrl: null },
                            { name: 'Doc B', url: null, fileUrl: 'https://file.example.com/b.pdf' },
                        ],
                    },
                }),
            })
        );
    });

    it('sets parentId when creating a child page', async () => {
        mockAdmin();

        const fakePage = buildPage({ id: 'child-page', name: 'Team', parentId: 'page-1' });
        mockedDb.page.create = jest.fn().mockResolvedValue(fakePage);
        syncDb();

        await createPage({ name: 'Team', parentId: 'page-1', items: [] });

        expect(mockedDb.page.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ parentId: 'page-1' }),
            })
        );
    });

    it('superadmin can also create a page', async () => {
        mockAdmin('superadmin');

        mockedDb.page.create = jest.fn().mockResolvedValue(buildPage({ name: 'Governance' }));
        syncDb();

        const result = await createPage({ name: 'Governance', items: [] });

        expect(result.name).toBe('Governance');
    });
});

// ── updatePage ────────────────────────────────────────────────────────

describe('updatePage', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(updatePage('page-1', { name: 'New' })).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(updatePage('page-1', { name: 'New' })).rejects.toThrow('Forbidden');
    });

    it('throws if new name is empty', async () => {
        mockAdmin();

        await expect(updatePage('page-1', { name: '   ' })).rejects.toThrow(
            'Page name is required'
        );
    });

    it('updates the page name, trimming whitespace', async () => {
        mockAdmin();

        mockedDb.page.update = jest.fn().mockResolvedValue(
            buildPage({ id: 'page-1', name: 'Updated Name' })
        );
        syncDb();

        const result = await updatePage('page-1', { name: '  Updated Name  ' });

        expect(result.name).toBe('Updated Name');
        expect(mockedDb.page.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'page-1' },
                data: { name: 'Updated Name' },
            })
        );
    });
});

// ── deletePage ────────────────────────────────────────────────────────

describe('deletePage', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(deletePage('page-1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(deletePage('page-1')).rejects.toThrow('Forbidden');
    });

    it('deletes the page and returns success', async () => {
        mockAdmin();

        mockedDb.page.delete = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deletePage('page-1');

        expect(result).toEqual({ success: true });
        expect(mockedDb.page.delete).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'page-1' } })
        );
    });

    it('propagates database errors to the caller', async () => {
        mockAdmin();

        mockedDb.page.delete = jest
            .fn()
            .mockRejectedValue(new Error('Foreign key constraint'));
        syncDb();

        await expect(deletePage('page-ghost')).rejects.toThrow('Foreign key constraint');
    });
});

// ── addPageItem ───────────────────────────────────────────────────────

describe('addPageItem', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(
            addPageItem('page-1', { name: 'Item' })
        ).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(addPageItem('page-1', { name: 'Item' })).rejects.toThrow('Forbidden');
    });

    it('creates a page item with url and trims name', async () => {
        mockAdmin();

        const fakeItem = {
            id: 'item-new',
            name: 'Annual Report',
            url: 'https://example.com/report',
            fileUrl: null,
            pageId: 'page-1',
        };
        mockedDb.pageItem.create = jest.fn().mockResolvedValue(fakeItem);
        syncDb();

        const result = await addPageItem('page-1', {
            name: '  Annual Report  ',
            url: '  https://example.com/report  ',
        });

        expect(result.name).toBe('Annual Report');
        expect(mockedDb.pageItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Annual Report',
                    url: 'https://example.com/report',
                    fileUrl: null,
                    pageId: 'page-1',
                }),
            })
        );
    });

    it('creates a page item with fileUrl', async () => {
        mockAdmin();

        const fakeItem = {
            id: 'item-file',
            name: 'Policy Doc',
            url: null,
            fileUrl: 'https://cdn.example.com/policy.pdf',
            pageId: 'page-1',
        };
        mockedDb.pageItem.create = jest.fn().mockResolvedValue(fakeItem);
        syncDb();

        const result = await addPageItem('page-1', {
            name: 'Policy Doc',
            fileUrl: 'https://cdn.example.com/policy.pdf',
        });

        expect(result.fileUrl).toBe('https://cdn.example.com/policy.pdf');
        expect(mockedDb.pageItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    fileUrl: 'https://cdn.example.com/policy.pdf',
                    url: null,
                }),
            })
        );
    });

    it('stores null for url when not provided', async () => {
        mockAdmin();

        mockedDb.pageItem.create = jest.fn().mockResolvedValue({
            id: 'item-no-url',
            name: 'No URL',
            url: null,
            fileUrl: null,
            pageId: 'page-1',
        });
        syncDb();

        await addPageItem('page-1', { name: 'No URL' });

        expect(mockedDb.pageItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ url: null }),
            })
        );
    });
});

// ── updatePageItem ────────────────────────────────────────────────────

describe('updatePageItem', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(
            updatePageItem('item-1', { name: 'New' })
        ).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(
            updatePageItem('item-1', { name: 'New' })
        ).rejects.toThrow('Forbidden');
    });

    it('throws if item name is empty', async () => {
        mockAdmin();

        await expect(
            updatePageItem('item-1', { name: '   ' })
        ).rejects.toThrow('Item name is required');
    });

    it('updates item name, url, and fileUrl, trimming strings', async () => {
        mockAdmin();

        const fakeItem = {
            id: 'item-1',
            name: 'Updated Report',
            url: 'https://new.example.com',
            fileUrl: null,
        };
        mockedDb.pageItem.update = jest.fn().mockResolvedValue(fakeItem);
        syncDb();

        const result = await updatePageItem('item-1', {
            name: '  Updated Report  ',
            url: '  https://new.example.com  ',
        });

        expect(result.name).toBe('Updated Report');
        expect(mockedDb.pageItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'item-1' },
                data: expect.objectContaining({
                    name: 'Updated Report',
                    url: 'https://new.example.com',
                    fileUrl: null,
                }),
            })
        );
    });

    it('sets url to null when not provided', async () => {
        mockAdmin();

        mockedDb.pageItem.update = jest.fn().mockResolvedValue({
            id: 'item-1',
            name: 'No URL Item',
            url: null,
            fileUrl: null,
        });
        syncDb();

        await updatePageItem('item-1', { name: 'No URL Item' });

        expect(mockedDb.pageItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ url: null }),
            })
        );
    });

    it('updates fileUrl correctly', async () => {
        mockAdmin();

        mockedDb.pageItem.update = jest.fn().mockResolvedValue({
            id: 'item-1',
            name: 'Policy',
            url: null,
            fileUrl: 'https://cdn.example.com/updated.pdf',
        });
        syncDb();

        const result = await updatePageItem('item-1', {
            name: 'Policy',
            fileUrl: 'https://cdn.example.com/updated.pdf',
        });

        expect(result.fileUrl).toBe('https://cdn.example.com/updated.pdf');
    });

    it('propagates database errors to the caller', async () => {
        mockAdmin();

        mockedDb.pageItem.update = jest
            .fn()
            .mockRejectedValue(new Error('Record not found'));
        syncDb();

        await expect(
            updatePageItem('item-ghost', { name: 'Ghost' })
        ).rejects.toThrow('Record not found');
    });
});

// ── deletePageItem ────────────────────────────────────────────────────

describe('deletePageItem', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(deletePageItem('item-1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(deletePageItem('item-1')).rejects.toThrow('Forbidden');
    });

    it('deletes the item and returns success', async () => {
        mockAdmin();

        mockedDb.pageItem.delete = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deletePageItem('item-1');

        expect(result).toEqual({ success: true });
        expect(mockedDb.pageItem.delete).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'item-1' } })
        );
    });

    it('propagates database errors to the caller', async () => {
        mockAdmin();

        mockedDb.pageItem.delete = jest
            .fn()
            .mockRejectedValue(new Error('Item not found'));
        syncDb();

        await expect(deletePageItem('item-ghost')).rejects.toThrow('Item not found');
    });

    it('superadmin can also delete a page item', async () => {
        mockAdmin('superadmin');

        mockedDb.pageItem.delete = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deletePageItem('item-1');

        expect(result).toEqual({ success: true });
    });
});