import type { authSession } from '@/lib/auth-utils';
import type { notifyAdmins as NotifyAdminsType } from '@/lib/notify-admins';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        user: {},
        auditLog: {},
        post: {},
        project: {},
        communityTopic: {},
        communityReply: {},
        comment: {},
        report: {},
        notification: {},
        session: {},
    },
}));

jest.mock('@/lib/notify-admins', () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';
import { notifyAdmins as _notifyAdmins } from '@/lib/notify-admins';

import {
    getUserManagementData,
    getAdminStats,
    getAuditLogs,
    getReports,
    createReport,
    resolveReport,
    sendWarning,
    banUserById,
    unbanUserById,
    activateUser,
    deleteReportedContent,
    applyRoleChange,
} from '@/app/actions/admin';


const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;
const mockedNotifyAdmins = _notifyAdmins as jest.MockedFunction<typeof NotifyAdminsType>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    auditLog: MockTable;
    post: MockTable;
    project: MockTable;
    communityTopic: MockTable;
    communityReply: MockTable;
    comment: MockTable;
    report: MockTable;
    notification: MockTable;
    session: MockTable;
}

const mockedDb = _db as unknown as MockDb;


/** Writes every MockTable back to the live db reference so action modules see fresh mocks. */
function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.user = mockedDb.user;
    live.auditLog = mockedDb.auditLog;
    live.post = mockedDb.post;
    live.project = mockedDb.project;
    live.communityTopic = mockedDb.communityTopic;
    live.communityReply = mockedDb.communityReply;
    live.comment = mockedDb.comment;
    live.report = mockedDb.report;
    live.notification = mockedDb.notification;
    live.session = mockedDb.session;
}

/**
 * Full better-auth session shape, including additionalFields from auth.ts
 * (gender, welcomeEmailSent, profession, title).
 */
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
 * Sets up a session for an admin or superadmin AND mocks the first
 * db.user.findUnique call (the role check inside the action) to return
 * the correct role.  Tests that need additional findUnique calls must
 * chain .mockResolvedValueOnce() themselves.
 */
function mockAdmin(role: 'admin' | 'superadmin' = 'admin'): void {
    mockSession('admin-1', 'Admin User');
    mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role });
    syncDb();
}


beforeEach(() => {
    jest.clearAllMocks();

    // Reset every table to a fresh plain object.
    mockedDb.user = {};
    mockedDb.auditLog = {};
    mockedDb.post = {};
    mockedDb.project = {};
    mockedDb.communityTopic = {};
    mockedDb.communityReply = {};
    mockedDb.comment = {};
    mockedDb.report = {};
    mockedDb.notification = {};
    mockedDb.session = {};
    syncDb();

    mockedNotifyAdmins.mockResolvedValue(undefined);
});

// ── getUserManagementData ─────────────────────────────────────────────

describe('getUserManagementData', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getUserManagementData()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for non-admin', async () => {
        mockSession('user-1', 'Regular User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getUserManagementData()).rejects.toThrow('Forbidden');
    });

    it('returns stats and users for admin', async () => {
        mockAdmin('admin');

        // getUserManagementData calls user.count (×4), auditLog.findMany,
        // user.findMany — all in Promise.all — then user.count again.
        mockedDb.user.count = jest.fn().mockResolvedValue(100);
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: 'u1', name: 'User1', role: 'user', banned: false },
        ]);
        mockedDb.auditLog.findMany = jest.fn().mockResolvedValue([
            {
                id: 'a1',
                action: 'LOGIN',
                details: '...',
                targetId: null,
                createdAt: new Date(),
                user: { name: 'Admin', email: 'admin@test.com' },
            },
        ]);
        syncDb();

        const data = await getUserManagementData();

        expect(data.stats.totalUsers).toBe(100);
        expect(data.recentActivity).toHaveLength(1);
        expect(data.users).toHaveLength(1);
    });

    it('returns all roles for superadmin', async () => {
        mockAdmin('superadmin');

        mockedDb.user.count = jest.fn().mockResolvedValue(50);
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: 'u1', name: 'Admin', role: 'admin', banned: false },
            { id: 'u2', name: 'User', role: 'user', banned: false },
        ]);
        mockedDb.auditLog.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        const data = await getUserManagementData();
        expect(data.users).toHaveLength(2);
    });
});

// ── getAdminStats ─────────────────────────────────────────────────────

describe('getAdminStats', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getAdminStats()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getAdminStats()).rejects.toThrow('Forbidden');
    });

    it('returns aggregated stats for admin', async () => {
        mockAdmin('admin');

        mockedDb.user.count = jest.fn().mockResolvedValue(10);
        mockedDb.post.count = jest.fn().mockResolvedValue(5);
        mockedDb.project.count = jest.fn().mockResolvedValue(4);
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(3);
        mockedDb.report.count = jest.fn().mockResolvedValue(2);
        syncDb();

        const stats = await getAdminStats();

        expect(stats.totalUsers).toBe(10);
        expect(stats.totalPosts).toBe(5);
        expect(stats.pendingReports).toBe(2);
        // bannedUsers comes from second user.count call — both return 10
        expect(stats.activeUsers).toBe(10 - 10);
    });
});

// ── getAuditLogs ──────────────────────────────────────────────────────

describe('getAuditLogs', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getAuditLogs()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getAuditLogs()).rejects.toThrow('Forbidden');
    });

    it('returns paginated audit logs for admin', async () => {
        mockAdmin('admin');

        mockedDb.auditLog.findMany = jest.fn().mockResolvedValue([
            { id: 'l1', action: 'LOGIN', user: { id: 'u1', name: 'Admin', email: 'a@test.com' } },
        ]);
        mockedDb.auditLog.count = jest.fn().mockResolvedValue(1);
        syncDb();

        const result = await getAuditLogs(1, 10);

        expect(result.logs).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
    });

    it('calculates pages correctly', async () => {
        mockAdmin('admin');

        mockedDb.auditLog.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.auditLog.count = jest.fn().mockResolvedValue(25);
        syncDb();

        const result = await getAuditLogs(1, 10);
        expect(result.pages).toBe(3); // Math.ceil(25/10)
    });
});

// ── getReports ────────────────────────────────────────────────────────

describe('getReports', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getReports()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getReports()).rejects.toThrow('Forbidden');
    });

    it('returns paginated reports for admin', async () => {
        mockAdmin('admin');

        mockedDb.report.findMany = jest.fn().mockResolvedValue([
            { id: 'r1', reason: 'Spam', user: { id: 'u1', name: 'Reporter' } },
        ]);
        mockedDb.report.count = jest.fn().mockResolvedValue(1);
        syncDb();

        const result = await getReports();

        expect(result.reports).toHaveLength(1);
        expect(result.total).toBe(1);
    });
});

// ── createReport ──────────────────────────────────────────────────────

describe('createReport', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(
            createReport({ contentType: 'POST', contentId: 'p1', reason: 'Spam' })
        ).rejects.toThrow('Unauthorized');
    });

    it('creates a report and notifies admins', async () => {
        mockSession('user-1', 'Reporter');
        mockedDb.report.create = jest.fn().mockResolvedValue({
            id: 'r1',
            reason: 'Spam',
            contentType: 'POST',
            contentId: 'p1',
        });
        syncDb();

        const result = await createReport({
            contentType: 'POST',
            contentId: 'p1',
            reason: 'Spam',
        });

        expect(result).toHaveProperty('id', 'r1');
        expect(mockedDb.report.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    reason: 'Spam',
                    contentType: 'POST',
                    contentId: 'p1',
                    userId: 'user-1',
                }),
            })
        );
        expect(mockedNotifyAdmins).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'SYSTEM' })
        );
    });
});

// ── resolveReport ─────────────────────────────────────────────────────

describe('resolveReport', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(resolveReport('r1', 'REVIEWED')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(resolveReport('r1', 'REVIEWED')).rejects.toThrow('Forbidden');
    });

    it('resolves a report and writes an audit log', async () => {
        mockAdmin('admin');

        mockedDb.report.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await resolveReport('r1', 'REVIEWED');

        expect(result.success).toBe(true);
        expect(mockedDb.report.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'r1' },
                data: { status: 'REVIEWED' },
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'RESOLVE_REPORT' }),
            })
        );
    });

    it('resolves a report as DISMISSED', async () => {
        mockAdmin('admin');

        mockedDb.report.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await resolveReport('r1', 'DISMISSED');
        expect(result.success).toBe(true);
        expect(mockedDb.report.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'DISMISSED' } })
        );
    });
});

// ── sendWarning ───────────────────────────────────────────────────────

describe('sendWarning', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(sendWarning('user-1', 'Stop it')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(sendWarning('user-2', 'Stop it')).rejects.toThrow('Forbidden');
    });

    it('creates a SYSTEM notification and audit log', async () => {
        mockAdmin('admin');

        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await sendWarning('user-2', 'Please follow the rules');

        expect(result.success).toBe(true);
        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'SYSTEM',
                    message: 'Please follow the rules',
                    userId: 'user-2',
                }),
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'SEND_WARNING' }),
            })
        );
    });
});

// ── banUserById ───────────────────────────────────────────────────────

describe('banUserById', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(banUserById('user-2', 'Spam')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users calling the action', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(banUserById('user-2', 'Spam')).rejects.toThrow('Forbidden');
    });

    it('admin can ban a regular user', async () => {
        mockAdmin('admin');

        // requireAdmin → findUnique (admin-1) → 'admin'
        // banUserById → findUnique (admin-1 acting) → 'admin'
        // banUserById → findUnique (user-2 target) → 'user'
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })  // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' })  // acting user
            .mockResolvedValueOnce({ role: 'user' });  // target user

        mockedDb.user.update = jest.fn().mockResolvedValue({});
        mockedDb.session.deleteMany = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await banUserById('user-2', 'Spam');

        expect(result.success).toBe(true);
        expect(mockedDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-2' },
                data: { banned: true, banReason: 'Spam' },
            })
        );
        expect(mockedDb.session.deleteMany).toHaveBeenCalledWith({
            where: { userId: 'user-2' },
        });
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'BAN_USER' }),
            })
        );
    });

    it('prevents regular admin from banning another admin', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user
            .mockResolvedValueOnce({ role: 'admin' }); // target user is also admin

        syncDb();

        await expect(banUserById('admin-2', 'bad')).rejects.toThrow('Forbidden');
    });

    it('superadmin can ban another admin', async () => {
        mockAdmin('superadmin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'superadmin' }) // acting user
            .mockResolvedValueOnce({ role: 'admin' });     // target user

        mockedDb.user.update = jest.fn().mockResolvedValue({});
        mockedDb.session.deleteMany = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await banUserById('admin-2', 'Misconduct');
        expect(result.success).toBe(true);
    });

    it('throws User not found when target does not exist', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user
            .mockResolvedValueOnce(null);              // target not found

        syncDb();

        await expect(banUserById('ghost-user', 'reason')).rejects.toThrow(
            'User not found'
        );
    });
});

// ── unbanUserById ─────────────────────────────────────────────────────

describe('unbanUserById', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(unbanUserById('user-2')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(unbanUserById('user-2')).rejects.toThrow('Forbidden');
    });

    it('throws User not found when target does not exist', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce(null);              // target not found

        syncDb();

        await expect(unbanUserById('ghost')).rejects.toThrow('User not found');
    });

    it('unbans user and writes audit log', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })                            // requireAdmin
            .mockResolvedValueOnce({ name: 'Banned', email: 'b@test.com' });     // target

        mockedDb.user.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await unbanUserById('user-2');

        expect(result.success).toBe(true);
        expect(mockedDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-2' },
                data: { banned: false, banReason: null, banExpires: null },
            })
        );
    });
});

// ── activateUser ──────────────────────────────────────────────────────

describe('activateUser', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(activateUser('user-1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular admin (only superadmin can activate)', async () => {
        mockAdmin('admin');

        // requireAdmin passes (admin role is fine), then activateUser does a
        // second findUnique to check for 'superadmin' specifically.
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }); // activateUser superadmin check

        syncDb();

        await expect(activateUser('user-1')).rejects.toThrow('super-admins');
    });

    it('superadmin activates a pending user', async () => {
        mockAdmin('superadmin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'superadmin' }); // activateUser check

        mockedDb.user.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await activateUser('user-1');

        expect(result.success).toBe(true);
        expect(mockedDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: { pendingActivation: false, activationExpiresAt: null },
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'ACTIVATE_USER' }),
            })
        );
    });
});

// ── deleteReportedContent ─────────────────────────────────────────────

describe('deleteReportedContent', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(deleteReportedContent('POST', 'p1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(deleteReportedContent('POST', 'p1')).rejects.toThrow('Forbidden');
    });

    it('soft-deletes a POST', async () => {
        mockAdmin('superadmin');

        // requireAdmin check + acting user check
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin
            .mockResolvedValueOnce({ role: 'superadmin' }); // acting user in deleteReportedContent

        mockedDb.post.findUnique = jest.fn().mockResolvedValue({ deleted: false });
        mockedDb.post.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteReportedContent('POST', 'p1');

        expect(result.success).toBe(true);
        expect(mockedDb.post.update).toHaveBeenCalledWith({
            where: { id: 'p1' },
            data: { deleted: true },
        });
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'DELETE_CONTENT' }),
            })
        );
    });

    it('soft-deletes a COMMENT', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({ deleted: false });
        mockedDb.comment.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteReportedContent('COMMENT', 'c1');
        expect(result.success).toBe(true);
        expect(mockedDb.comment.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { deleted: true },
        });
    });

    it('soft-deletes a TOPIC', async () => {
        mockAdmin('superadmin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin
            .mockResolvedValueOnce({ role: 'superadmin' }); // acting user check

        mockedDb.communityTopic.findUnique = jest
            .fn()
            // First call: permission check (topic owner lookup path)
            .mockResolvedValueOnce({ deleted: false, userId: 'user-1' })
            // Second call: switch-case findUnique
            .mockResolvedValueOnce({ deleted: false });

        mockedDb.communityTopic.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteReportedContent('TOPIC', 'topic-1');
        expect(result.success).toBe(true);
        expect(mockedDb.communityTopic.update).toHaveBeenCalledWith({
            where: { id: 'topic-1' },
            data: { deleted: true },
        });
    });

    it('soft-deletes a REPLY', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockedDb.communityReply.findUnique = jest.fn().mockResolvedValue({ deleted: false });
        mockedDb.communityReply.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteReportedContent('REPLY', 'reply-1');
        expect(result.success).toBe(true);
        expect(mockedDb.communityReply.update).toHaveBeenCalledWith({
            where: { id: 'reply-1' },
            data: { deleted: true },
        });
    });

    it('skips update if content is already deleted', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockedDb.post.findUnique = jest.fn().mockResolvedValue({ deleted: true });
        mockedDb.post.update = jest.fn();
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteReportedContent('POST', 'p1');
        expect(result.success).toBe(true);
        // update should NOT have been called since content is already deleted
        expect(mockedDb.post.update).not.toHaveBeenCalled();
    });

    it('throws for unknown content type', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await expect(deleteReportedContent('UNKNOWN', 'x1')).rejects.toThrow(
            'Unknown content type'
        );
    });
});

// ── applyRoleChange ───────────────────────────────────────────────────

describe('applyRoleChange', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(applyRoleChange('user-1', 'user', 'admin')).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(applyRoleChange('user-2', 'user', 'admin')).rejects.toThrow(
            'Forbidden'
        );
    });

    it('throws User not found when target does not exist', async () => {
        mockAdmin('admin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce(null);              // target not found

        syncDb();

        await expect(applyRoleChange('ghost', 'user', 'admin')).rejects.toThrow(
            'User not found'
        );
    });

    it('invalidates sessions, notifies user, and writes audit log', async () => {
        mockAdmin('superadmin');

        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'superadmin' })                       // requireAdmin
            .mockResolvedValueOnce({ name: 'User', email: 'user@test.com' });    // target

        mockedDb.session.deleteMany = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await applyRoleChange('user-1', 'user', 'admin');

        expect(result.success).toBe(true);
        expect(mockedDb.session.deleteMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
        });
        expect(mockedDb.notification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user-1',
                type: 'SYSTEM',
            }),
        });
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'CHANGE_ROLE',
                    targetId: 'user-1',
                }),
            })
        );
    });
});