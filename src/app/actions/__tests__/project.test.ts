
import type { authSession } from '@/lib/auth-utils';
import type { notifyAdmins as NotifyAdminsType } from '@/lib/notify-admins';
import type { sendNotificationEmail as SendNotificationEmailType } from '@/lib/send-notification-email';

// ── Mocks (must come before any imports that use them) ────────────────

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        project: {},
        user: {},
        notification: {},
        reviewAssignment: {},
        auditLog: {},
        post: {},
        $transaction: jest.fn(),
    },
}));

jest.mock('@/lib/notify-admins', () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/send-notification-email', () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('crypto', () => ({
    ...jest.requireActual('crypto'),
    randomBytes: jest.fn(() => ({
        toString: jest.fn().mockReturnValue('ABCD1234'),
    })),
}));

// ── Typed imports (after jest.mock calls) ─────────────────────────────

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';
import { notifyAdmins as _notifyAdmins } from '@/lib/notify-admins';
import {
    sendNotificationEmail as _sendNotificationEmail,
} from '@/lib/send-notification-email';

import {
    submitProject,
    getProjectById,
    getUserProjects,
    getAllProjects,
    updateProjectStatus,
    deleteProject,
    updateProject,
    forwardProjectToFeed,
    getAdminUsers,
    assignProjectReviewer,
    autoAssignProjectReviewer,
    reassignProjectReviewer,
    getProjectReviewAssignments,
    trackProjectByCode,
} from '@/app/actions/project';

// ── Typed mock references ─────────────────────────────────────────────

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;
const mockedNotifyAdmins = _notifyAdmins as jest.MockedFunction<typeof NotifyAdminsType>;
const mockedSendNotificationEmail = _sendNotificationEmail as jest.MockedFunction<
    typeof SendNotificationEmailType
>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    project: MockTable;
    user: MockTable;
    notification: MockTable;
    reviewAssignment: MockTable;
    auditLog: MockTable;
    post: MockTable;
    $transaction: jest.Mock;
}

const mockedDb = _db as unknown as MockDb;

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Syncs every table back to the live `db` reference so action modules
 * always see the freshly-reset MockTable objects.
 * Must be called after every mutation of mockedDb.*
 */
function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.project = mockedDb.project;
    live.user = mockedDb.user;
    live.notification = mockedDb.notification;
    live.reviewAssignment = mockedDb.reviewAssignment;
    live.auditLog = mockedDb.auditLog;
    live.post = mockedDb.post;
    live.$transaction = mockedDb.$transaction;
}

/**
 * Full better-auth session shape including additionalFields from auth.ts
 * (gender, welcomeEmailSent, profession, title).
 */
function mockSession(userId = 'user-1', name = 'Test User'): void {
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
            role: 'user',
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

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.project = {};
    mockedDb.user = {};
    mockedDb.notification = {};
    mockedDb.reviewAssignment = {};
    mockedDb.auditLog = {};
    mockedDb.post = {};
    mockedDb.$transaction = jest.fn();

    // Critical: keep the live reference in sync
    syncDb();

    mockedNotifyAdmins.mockResolvedValue(undefined);
    mockedSendNotificationEmail.mockResolvedValue(undefined);
});

// ── submitProject ─────────────────────────────────────────────────────

describe('submitProject', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(
            submitProject({ title: 'T', description: 'D', category: 'C' })
        ).rejects.toThrow('Unauthorized');
    });

    it('throws if title is empty', async () => {
        mockSession('user-1');
        await expect(
            submitProject({ title: '  ', description: 'D', category: 'C' })
        ).rejects.toThrow('Protocol title is required');
    });

    it('throws if description is empty', async () => {
        mockSession('user-1');
        await expect(
            submitProject({ title: 'T', description: '  ', category: 'C' })
        ).rejects.toThrow('Protocol description is required');
    });

    it('throws if category is empty', async () => {
        mockSession('user-1');
        await expect(
            submitProject({ title: 'T', description: 'D', category: '  ' })
        ).rejects.toThrow('Protocol category is required');
    });

    it('admin submits with APPROVED status', async () => {
        mockSession('admin-1', 'Admin User');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null); // no tracking code collision
        syncDb();

        const fakeProject = {
            id: 'proj1',
            trackingCode: 'CNERSH-2024-ABCD1234',
            title: 'Test',
            status: 'APPROVED',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
        };

        mockedDb.$transaction = jest.fn().mockImplementation(
            async (cb: (tx: MockTable) => Promise<unknown>) =>
                cb({
                    project: { create: jest.fn().mockResolvedValue(fakeProject) },
                    reviewAssignment: { create: jest.fn().mockResolvedValue({}) },
                } as unknown as MockTable)
        );
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitProject({
            title: 'Test',
            description: 'Desc',
            category: 'Health',
        });

        expect(result.status).toBe('APPROVED');
        expect(result.trackingCode).toContain('CNERSH-');
        expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('regular user gets PENDING_REVIEW when reviewer available', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.user.findFirst = jest.fn().mockResolvedValue({
            id: 'admin-2',
            name: 'Admin2',
            email: 'admin2@test.com',
        });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        const fakeProject = {
            id: 'proj2',
            trackingCode: 'CNERSH-2024-ABCD1234',
            title: 'User project',
            status: 'PENDING_REVIEW',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
        };

        mockedDb.$transaction = jest.fn().mockImplementation(
            async (cb: (tx: MockTable) => Promise<unknown>) =>
                cb({
                    project: { create: jest.fn().mockResolvedValue(fakeProject) },
                    reviewAssignment: { create: jest.fn().mockResolvedValue({}) },
                } as unknown as MockTable)
        );
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitProject({
            title: 'User project',
            description: 'Desc',
            category: 'Tech',
        });

        expect(result.status).toBe('PENDING_REVIEW');
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'admin2@test.com',
                notificationType: 'REVIEW_ASSIGNED',
            })
        );
        expect(mockedNotifyAdmins).toHaveBeenCalled();
    });

    it('regular user gets SUBMITTED when no reviewer available', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.reviewAssignment.findMany = jest
            .fn()
            .mockResolvedValue([{ reviewerId: 'admin-2' }]);
        mockedDb.user.findFirst = jest.fn().mockResolvedValue(null);
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        const fakeProject = {
            id: 'proj3',
            trackingCode: 'CNERSH-2024-ABCD1234',
            title: 'No reviewer',
            status: 'SUBMITTED',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
        };

        mockedDb.$transaction = jest.fn().mockImplementation(
            async (cb: (tx: MockTable) => Promise<unknown>) =>
                cb({
                    project: { create: jest.fn().mockResolvedValue(fakeProject) },
                    reviewAssignment: { create: jest.fn().mockResolvedValue({}) },
                } as unknown as MockTable)
        );
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitProject({
            title: 'No reviewer',
            description: 'Desc',
            category: 'Tech',
        });

        expect(result.status).toBe('SUBMITTED');
        expect(mockedSendNotificationEmail).not.toHaveBeenCalled();
        expect(mockedNotifyAdmins).toHaveBeenCalled();
    });
});

// ── getProjectById ────────────────────────────────────────────────────

describe('getProjectById', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getProjectById('proj1')).rejects.toThrow('Unauthorized');
    });

    it('returns null if project does not exist', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        expect(await getProjectById('proj1')).toBeNull();
    });

    it('returns project for the owner', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', image: null },
            reviewAssignments: [],
            statusHistory: [],
            appeal: null,
            aarApplication: null,
            saeReports: [],
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        const proj = await getProjectById('proj1');
        expect(proj).toHaveProperty('id', 'proj1');
    });

    it('throws Forbidden for an unrelated regular user', async () => {
        mockSession('user-2');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            reviewAssignments: [],
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getProjectById('proj1')).rejects.toThrow('Forbidden');
    });

    it('allows admin to access any project', async () => {
        mockSession('admin-1', 'Admin User');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', image: null },
            reviewAssignments: [],
            statusHistory: [],
            appeal: null,
            aarApplication: null,
            saeReports: [],
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        syncDb();

        const proj = await getProjectById('proj1');
        expect(proj).toHaveProperty('id', 'proj1');
    });

    it('allows the assigned active reviewer to access the project', async () => {
        mockSession('admin-reviewer', 'Reviewer');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', image: null },
            reviewAssignments: [
                { reviewerId: 'admin-reviewer', status: 'ACTIVE', evaluationReport: null },
            ],
            statusHistory: [],
            appeal: null,
            aarApplication: null,
            saeReports: [],
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        syncDb();

        const proj = await getProjectById('proj1');
        expect(proj).toHaveProperty('id', 'proj1');
    });
});

// ── getUserProjects ───────────────────────────────────────────────────

describe('getUserProjects', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getUserProjects()).rejects.toThrow('Unauthorized');
    });

    it('returns user projects', async () => {
        mockSession('user-1');
        mockedDb.project.findMany = jest.fn().mockResolvedValue([{ id: 'p1' }]);
        syncDb();

        const projects = await getUserProjects();
        expect(projects).toHaveLength(1);
        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1', deleted: false },
            })
        );
    });

    it('returns empty array on database error', async () => {
        mockSession('user-1');
        mockedDb.project.findMany = jest
            .fn()
            .mockRejectedValue(new Error('fail'));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        expect(await getUserProjects()).toEqual([]);
        consoleErrorSpy.mockRestore();
    });
});

// ── getAllProjects ─────────────────────────────────────────────────────

describe('getAllProjects', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getAllProjects()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getAllProjects()).rejects.toThrow('Forbidden');
    });

    it('returns all projects for admin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.project.findMany = jest
            .fn()
            .mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
        syncDb();

        const projects = await getAllProjects();
        expect(projects).toHaveLength(2);
    });

    it('filters by status when provided', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.project.findMany = jest.fn().mockResolvedValue([{ id: 'p1' }]);
        syncDb();

        await getAllProjects('APPROVED' as never);

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { deleted: false, status: 'APPROVED' },
            })
        );
    });
});

// ── updateProjectStatus ───────────────────────────────────────────────

describe('updateProjectStatus', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(updateProjectStatus('proj1', 'APPROVED')).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(updateProjectStatus('proj1', 'APPROVED')).rejects.toThrow(
            'Forbidden'
        );
    });

    it('admin updates status and notifies owner', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest
            .fn()
            // 1st call: check admin role
            .mockResolvedValueOnce({ role: 'admin' })
            // 2nd call: get owner email for email notification
            .mockResolvedValueOnce({ email: 'owner@test.com', name: 'Owner' });
        mockedDb.project.update = jest.fn().mockResolvedValue({
            id: 'proj1',
            title: 'Test',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await updateProjectStatus('proj1', 'APPROVED', 'Looks good');

        expect(result).toHaveProperty('status', 'APPROVED');
        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'PROJECT_STATUS',
                    userId: 'user-1',
                }),
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'owner@test.com',
                notificationType: 'PROJECT_STATUS',
            })
        );
    });
});

// ── deleteProject ─────────────────────────────────────────────────────

describe('deleteProject', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(deleteProject('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws if project not found', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(deleteProject('proj1')).rejects.toThrow('Protocol not found');
    });

    it('allows the owner to delete their project', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.project.update = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteProject('proj1');
        expect(result.success).toBe(true);
        expect(mockedDb.project.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { deleted: true } })
        );
    });

    it('allows admin to delete any project', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.project.update = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteProject('proj1');
        expect(result.success).toBe(true);
    });

    it('throws Forbidden for non-owner non-admin', async () => {
        mockSession('user-2');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(deleteProject('proj1')).rejects.toThrow('Forbidden');
    });
});

// ── updateProject ─────────────────────────────────────────────────────

describe('updateProject', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(updateProject('proj1', { title: 'New' })).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws if project not found', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(updateProject('proj1', { title: 'New' })).rejects.toThrow(
            'Protocol not found'
        );
    });

    it('allows the owner to update their project', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.project.update = jest
            .fn()
            .mockResolvedValue({ id: 'proj1', title: 'Updated' });
        syncDb();

        const result = await updateProject('proj1', { title: 'Updated' });
        expect(result).toHaveProperty('title', 'Updated');
    });

    it('throws Forbidden for non-owner non-admin', async () => {
        mockSession('user-2');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(updateProject('proj1', { title: 'X' })).rejects.toThrow('Forbidden');
    });
});

// ── forwardProjectToFeed ──────────────────────────────────────────────

describe('forwardProjectToFeed', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(
            forwardProjectToFeed('proj1', { content: 'hello' })
        ).rejects.toThrow('Unauthorized');
    });

    it('throws if project not found', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(
            forwardProjectToFeed('proj1', { content: 'hello' })
        ).rejects.toThrow('Protocol not found');
    });

    it('creates a post for the owner', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-1',
            title: 'My Project',
        });
        mockedDb.post.create = jest.fn().mockResolvedValue({ id: 'post-1' });
        syncDb();

        const result = await forwardProjectToFeed('proj1', {
            content: 'Check this out',
            tags: ['health'],
        });

        expect(result).toHaveProperty('id', 'post-1');
        expect(mockedDb.post.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    content: 'Check this out',
                    tags: ['health'],
                    userId: 'user-1',
                }),
            })
        );
    });
});

// ── getAdminUsers ─────────────────────────────────────────────────────

describe('getAdminUsers', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getAdminUsers()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for non-superadmin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        syncDb();

        await expect(getAdminUsers()).rejects.toThrow('Forbidden');
    });

    it('returns admin users with availability flags for superadmin', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            {
                id: 'admin-1',
                name: 'Admin A',
                email: 'a@test.com',
                image: null,
                role: 'admin',
                expertiseTags: [],
            },
        ]);
        mockedDb.reviewAssignment.findMany = jest
            .fn()
            .mockResolvedValue([{ reviewerId: 'admin-1' }]);
        syncDb();

        const result = await getAdminUsers();

        expect(result).toHaveLength(1);
        expect(result[0].isAvailable).toBe(false);
        expect(result[0].activeAssignmentCount).toBe(1);
    });
});

// ── assignProjectReviewer ─────────────────────────────────────────────

describe('assignProjectReviewer', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(assignProjectReviewer('proj1', 'admin-2')).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden for non-superadmin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        syncDb();

        await expect(assignProjectReviewer('proj1', 'admin-2')).rejects.toThrow(
            'Forbidden'
        );
    });

    it('throws if reviewer is not an admin', async () => {
        mockSession('super-1', 'Super Admin');

        // 1st findUnique: caller role check → superadmin
        // 2nd findUnique (inside Promise.all): the proposed reviewer → regular user
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' })
            .mockResolvedValueOnce({
                id: 'user-2',
                name: 'Regular',
                email: 'regular@test.com',
                role: 'user',
            });

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            title: 'Test',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
            reviewAssignments: [],
        });
        syncDb();

        await expect(assignProjectReviewer('proj1', 'user-2')).rejects.toThrow(
            'not an admin'
        );
    });

    it('throws if reviewer is already assigned', async () => {
        mockSession('super-1', 'Super Admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' })
            .mockResolvedValueOnce({
                id: 'admin-2',
                name: 'Admin Two',
                email: 'admin2@test.com',
                role: 'admin',
            });

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            title: 'Test',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
            // admin-2 is already in the list
            reviewAssignments: [{ reviewerId: 'admin-2' }],
        });
        syncDb();

        await expect(assignProjectReviewer('proj1', 'admin-2')).rejects.toThrow(
            'already assigned'
        );
    });

    it('superadmin assigns reviewer and notifies', async () => {
        mockSession('super-1', 'Super Admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' })
            .mockResolvedValueOnce({
                id: 'admin-2',
                name: 'Admin Two',
                email: 'admin2@test.com',
                role: 'admin',
            });

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            userId: 'user-1',
            title: 'Test Protocol',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
            reviewAssignments: [],
        });

        const updatedProject = {
            id: 'proj1',
            title: 'Test Protocol',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        };

        mockedDb.$transaction = jest.fn().mockImplementation(
            async (cb: (tx: MockTable) => Promise<unknown>) =>
                cb({
                    reviewAssignment: { create: jest.fn().mockResolvedValue({}) },
                    project: { update: jest.fn().mockResolvedValue(updatedProject) },
                } as unknown as MockTable)
        );
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await assignProjectReviewer('proj1', 'admin-2');

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ notificationType: 'REVIEW_ASSIGNED' })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'ASSIGN_REVIEWER' }),
            })
        );
    });
});

// ── autoAssignProjectReviewer ─────────────────────────────────────────

describe('autoAssignProjectReviewer', () => {
    // Suppress the action's own console.error for every test in this block
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(autoAssignProjectReviewer('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for non-superadmin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        syncDb();

        await expect(autoAssignProjectReviewer('proj1')).rejects.toThrow('Forbidden');
    });

    it('throws if project not found', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(autoAssignProjectReviewer('proj1')).rejects.toThrow(
            'Protocol not found'
        );
    });

    it('throws if project already has active assignment', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            reviewAssignments: [{ reviewerId: 'admin-2', status: 'ACTIVE' }],
        });
        syncDb();

        await expect(autoAssignProjectReviewer('proj1')).rejects.toThrow(
            'already has an active reviewer'
        );
    });

    it('throws if no available admin found', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            reviewAssignments: [],
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        });
        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.user.findFirst = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(autoAssignProjectReviewer('proj1')).rejects.toThrow(
            'No available admin'
        );
    });

    it('auto-assigns available admin and notifies', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            reviewAssignments: [],
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        });
        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.user.findFirst = jest.fn().mockResolvedValue({
            id: 'admin-3',
            name: 'Admin Three',
            email: 'admin3@test.com',
        });

        const updatedProject = {
            id: 'proj1',
            title: 'Test Protocol',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        };

        mockedDb.$transaction = jest.fn().mockImplementation(
            async (cb: (tx: MockTable) => Promise<unknown>) =>
                cb({
                    reviewAssignment: { create: jest.fn().mockResolvedValue({}) },
                    project: { update: jest.fn().mockResolvedValue(updatedProject) },
                } as unknown as MockTable)
        );
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await autoAssignProjectReviewer('proj1');

        expect(result).toHaveProperty('id', 'proj1');
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ notificationType: 'REVIEW_ASSIGNED' })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'AUTO_ASSIGN_REVIEWER' }),
            })
        );
    });
});

// ── reassignProjectReviewer ───────────────────────────────────────────

describe('reassignProjectReviewer', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(reassignProjectReviewer('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for non-superadmin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        syncDb();

        await expect(reassignProjectReviewer('proj1')).rejects.toThrow('Forbidden');
    });

    it('throws if project not found', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(reassignProjectReviewer('proj1')).rejects.toThrow(
            'Protocol not found'
        );
    });

    it('throws if no active assignment found', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        });
        mockedDb.reviewAssignment.findFirst = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(reassignProjectReviewer('proj1')).rejects.toThrow(
            'No active assignment'
        );
    });

    it('reassigns and notifies both old and new reviewer', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            title: 'Test Protocol',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        });
        mockedDb.reviewAssignment.findFirst = jest.fn().mockResolvedValue({
            id: 'assign-1',
            reviewerId: 'admin-2',
            reviewer: {
                id: 'admin-2',
                name: 'Admin Two',
                email: 'admin2@test.com',
            },
        });
        mockedDb.reviewAssignment.findMany = jest
            .fn()
            .mockResolvedValue([{ reviewerId: 'admin-2' }]);
        mockedDb.user.findFirst = jest.fn().mockResolvedValue({
            id: 'admin-3',
            name: 'Admin Three',
            email: 'admin3@test.com',
        });

        const updatedProject = {
            id: 'proj1',
            title: 'Test Protocol',
            user: { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        };

        mockedDb.$transaction = jest.fn().mockImplementation(
            async (cb: (tx: MockTable) => Promise<unknown>) =>
                cb({
                    reviewAssignment: {
                        update: jest.fn().mockResolvedValue({}),
                        create: jest.fn().mockResolvedValue({}),
                    },
                    project: { update: jest.fn().mockResolvedValue(updatedProject) },
                } as unknown as MockTable)
        );
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reassignProjectReviewer('proj1', 'COI conflict');

        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(2);
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'admin2@test.com',
                notificationType: 'REVIEW_REASSIGNED',
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'admin3@test.com',
                notificationType: 'REVIEW_REASSIGNED',
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'REASSIGN_REVIEWER' }),
            })
        );
    });
});

// ── getProjectReviewAssignments ───────────────────────────────────────

describe('getProjectReviewAssignments', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getProjectReviewAssignments('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getProjectReviewAssignments('proj1')).rejects.toThrow('Forbidden');
    });

    it('returns review assignments for admin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.reviewAssignment.findMany = jest
            .fn()
            .mockResolvedValue([{ id: 'assign-1', reviewerId: 'admin-2', status: 'ACTIVE' }]);
        syncDb();

        const result = await getProjectReviewAssignments('proj1');

        expect(result).toHaveLength(1);
        expect(mockedDb.reviewAssignment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { projectId: 'proj1' } })
        );
    });
});

// ── trackProjectByCode ────────────────────────────────────────────────

describe('trackProjectByCode', () => {
    it('returns null for empty / whitespace-only code', async () => {
        expect(await trackProjectByCode('   ')).toBeNull();
    });

    it('returns null when project does not exist', async () => {
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        expect(await trackProjectByCode('CNERSH-2024-ABCD')).toBeNull();
    });

    it('returns null for a deleted project', async () => {
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ deleted: true });
        syncDb();

        expect(await trackProjectByCode('CODE')).toBeNull();
    });

    it('returns public project info (no auth required)', async () => {
        const now = new Date();
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'p1',
            trackingCode: 'CNERSH-2024-ABCD',
            title: 'Test Protocol',
            category: 'Health',
            location: 'Douala',
            status: 'APPROVED',
            deleted: false,
            createdAt: now,
            updatedAt: now,
            statusHistory: [{ status: 'APPROVED', comment: 'All good', createdAt: now }],
        });
        syncDb();

        // Lowercase input — action should uppercase before lookup
        const result = await trackProjectByCode('cnersh-2024-abcd');

        expect(result).toHaveProperty('title', 'Test Protocol');
        expect(result).toHaveProperty('status', 'APPROVED');
        expect(mockedDb.project.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { trackingCode: 'CNERSH-2024-ABCD' },
            })
        );
    });
});