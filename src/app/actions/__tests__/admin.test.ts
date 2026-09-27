/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@/lib/auth-utils', () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock('@/lib/permissions', () => {
    const levels: Record<string, number> = { user: 0, admin: 1, superadmin: 2 };
    return {
        isRoleName: (role: unknown) => typeof role === 'string' && role in levels,
        isAdminRole: (role: unknown) => role === 'admin' || role === 'superadmin',
        canManageRole: (actor: string, target: string) =>
            (levels[actor] ?? -1) > (levels[target] ?? 99),
        canAssignRole: (actor: string, target: string) =>
            actor === 'superadmin' || (actor === 'admin' && target === 'user'),
    };
});

jest.mock('@/lib/db', () => ({
    db: {
        user: { count: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        auditLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
        post: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        project: { count: jest.fn() },
        communityTopic: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        communityReply: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        comment: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        report: { count: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
        notification: { create: jest.fn() },
        session: { deleteMany: jest.fn() },
    },
}));

jest.mock('@/lib/notify-admins', () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

import { verifiedAuthSession } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { notifyAdmins } from '@/lib/notify-admins';

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

const mockVerifiedAuthSession = verifiedAuthSession as jest.Mock;
const mockNotifyAdmins = notifyAdmins as jest.Mock;

const mockDb = db as unknown as {
    user: { count: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    auditLog: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
    post: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    project: { count: jest.Mock };
    communityTopic: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    communityReply: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    comment: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    report: { count: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    notification: { create: jest.Mock };
    session: { deleteMany: jest.Mock };
};

function mockSession(userId = 'admin-1', name = 'Admin User', role = 'admin'): void {
    mockVerifiedAuthSession.mockResolvedValue({
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@test.com`,
            emailVerified: true,
            role,
            banned: false,
            banReason: null,
            banExpires: null,
        },
    });
}

function mockAdmin(role: 'admin' | 'superadmin' = 'admin'): void {
    mockSession('admin-1', 'Admin User', role);
    // Default mock for the acting user's role check (e.g., inside requireAdmin)
    mockDb.user.findUnique.mockResolvedValue({ role });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockNotifyAdmins.mockResolvedValue(undefined);
});

// ── getUserManagementData ─────────────────────────────────────────────

describe('getUserManagementData', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(getUserManagementData()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for non-admin', async () => {
        mockSession('user-1', 'Regular User', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(getUserManagementData()).rejects.toThrow('Forbidden');
    });

    it('returns stats and users for admin', async () => {
        mockAdmin('admin');

        mockDb.user.count.mockResolvedValue(100);
        mockDb.user.findMany.mockResolvedValue([
            { id: 'u1', name: 'User1', role: 'user', banned: false },
        ]);
        mockDb.auditLog.findMany.mockResolvedValue([
            {
                id: 'a1',
                action: 'LOGIN',
                details: '...',
                targetId: null,
                createdAt: new Date(),
                user: { name: 'Admin', email: 'admin@test.com' },
            },
        ]);

        const data = await getUserManagementData();

        expect(data.stats.totalUsers).toBe(100);
        expect(data.recentActivity).toHaveLength(1);
        expect(data.users).toHaveLength(1);
    });

    it('returns all roles for superadmin', async () => {
        mockAdmin('superadmin');

        mockDb.user.count.mockResolvedValue(50);
        mockDb.user.findMany.mockResolvedValue([
            { id: 'u1', name: 'Admin', role: 'admin', banned: false },
            { id: 'u2', name: 'User', role: 'user', banned: false },
        ]);
        mockDb.auditLog.findMany.mockResolvedValue([]);

        const data = await getUserManagementData();
        expect(data.users).toHaveLength(2);
    });
});

// ── getAdminStats ─────────────────────────────────────────────────────

describe('getAdminStats', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(getAdminStats()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(getAdminStats()).rejects.toThrow('Forbidden');
    });

    it('returns aggregated stats for admin', async () => {
        mockAdmin('admin');

        mockDb.user.count.mockResolvedValue(10);
        mockDb.post.count.mockResolvedValue(5);
        mockDb.project.count.mockResolvedValue(4);
        mockDb.communityTopic.count.mockResolvedValue(3);
        mockDb.report.count.mockResolvedValue(2);

        const stats = await getAdminStats();

        expect(stats.totalUsers).toBe(10);
        expect(stats.totalPosts).toBe(5);
        expect(stats.pendingReports).toBe(2);
        // bannedUsers comes from second user.count call - both return 10
        expect(stats.activeUsers).toBe(10 - 10);
    });
});

// ── getAuditLogs ──────────────────────────────────────────────────────

describe('getAuditLogs', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(getAuditLogs()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(getAuditLogs()).rejects.toThrow('Forbidden');
    });

    it('returns paginated audit logs for admin', async () => {
        mockAdmin('admin');

        mockDb.auditLog.findMany.mockResolvedValue([
            { id: 'l1', action: 'LOGIN', user: { id: 'u1', name: 'Admin', email: 'a@test.com' } },
        ]);
        mockDb.auditLog.count.mockResolvedValue(1);

        const result = await getAuditLogs(1, 10);

        expect(result.logs).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
    });

    it('calculates pages correctly', async () => {
        mockAdmin('admin');

        mockDb.auditLog.findMany.mockResolvedValue([]);
        mockDb.auditLog.count.mockResolvedValue(25);

        const result = await getAuditLogs(1, 10);
        expect(result.pages).toBe(3); // Math.ceil(25/10)
    });
});

// ── getReports ────────────────────────────────────────────────────────

describe('getReports', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(getReports()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(getReports()).rejects.toThrow('Forbidden');
    });

    it('returns paginated reports for admin', async () => {
        mockAdmin('admin');

        mockDb.report.findMany.mockResolvedValue([
            { id: 'r1', reason: 'Spam', user: { id: 'u1', name: 'Reporter' } },
        ]);
        mockDb.report.count.mockResolvedValue(1);

        const result = await getReports();

        expect(result.reports).toHaveLength(1);
        expect(result.total).toBe(1);
    });
});

// ── createReport ──────────────────────────────────────────────────────

describe('createReport', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(
            createReport({ contentType: 'POST', contentId: 'p1', reason: 'Spam' })
        ).rejects.toThrow('Unauthorized');
    });

    it('creates a report and notifies admins', async () => {
        mockSession('user-1', 'Reporter', 'user');
        mockDb.report.create.mockResolvedValue({
            id: 'r1',
            reason: 'Spam',
            contentType: 'POST',
            contentId: 'p1',
        });

        const result = await createReport({
            contentType: 'POST',
            contentId: 'p1',
            reason: 'Spam',
        });

        expect(result).toHaveProperty('id', 'r1');
        expect(mockDb.report.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    reason: 'Spam',
                    contentType: 'POST',
                    contentId: 'p1',
                    userId: 'user-1',
                }),
            })
        );
        expect(mockNotifyAdmins).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'SYSTEM' })
        );
    });
});

// ── resolveReport ─────────────────────────────────────────────────────

describe('resolveReport', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(resolveReport('r1', 'REVIEWED')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(resolveReport('r1', 'REVIEWED')).rejects.toThrow('Forbidden');
    });

    it('resolves a report and writes an audit log', async () => {
        mockAdmin('admin');

        mockDb.report.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await resolveReport('r1', 'REVIEWED');

        expect(result.success).toBe(true);
        expect(mockDb.report.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'r1' },
                data: { status: 'REVIEWED' },
            })
        );
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'RESOLVE_REPORT' }),
            })
        );
    });

    it('resolves a report as DISMISSED', async () => {
        mockAdmin('admin');

        mockDb.report.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await resolveReport('r1', 'DISMISSED');
        expect(result.success).toBe(true);
        expect(mockDb.report.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'DISMISSED' } })
        );
    });
});

// ── sendWarning ───────────────────────────────────────────────────────

describe('sendWarning', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(sendWarning('user-1', 'Stop it')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(sendWarning('user-2', 'Stop it')).rejects.toThrow('Forbidden');
    });

    it('creates a SYSTEM notification and audit log', async () => {
        mockAdmin('admin');
        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user
            .mockResolvedValueOnce({ role: 'user' }); // target user

        mockDb.notification.create.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await sendWarning('user-2', 'Please follow the rules');

        expect(result.success).toBe(true);
        expect(mockDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'SYSTEM',
                    message: 'Please follow the rules',
                    userId: 'user-2',
                }),
            })
        );
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'SEND_WARNING' }),
            })
        );
    });
});

// ── banUserById ───────────────────────────────────────────────────────

describe('banUserById', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(banUserById('user-2', 'Spam')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users calling the action', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(banUserById('user-2', 'Spam')).rejects.toThrow('Forbidden');
    });

    it('admin can ban a regular user', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })  // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' })  // acting user
            .mockResolvedValueOnce({ role: 'user' });  // target user

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await banUserById('user-2', 'Spam');

        expect(result.success).toBe(true);
        expect(mockDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-2' },
                data: { banned: true, banReason: 'Spam' },
            })
        );
        expect(mockDb.session.deleteMany).toHaveBeenCalledWith({
            where: { userId: 'user-2' },
        });
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'BAN_USER' }),
            })
        );
    });

    it('prevents regular admin from banning another admin', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user
            .mockResolvedValueOnce({ role: 'admin' }); // target user is also admin

        await expect(banUserById('admin-2', 'bad')).rejects.toThrow('Forbidden');
    });

    it('superadmin can ban another admin', async () => {
        mockAdmin('superadmin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'superadmin' }) // acting user
            .mockResolvedValueOnce({ role: 'admin' });     // target user

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await banUserById('admin-2', 'Misconduct');
        expect(result.success).toBe(true);
    });

    it('throws User not found when target does not exist', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user
            .mockResolvedValueOnce(null);              // target not found

        await expect(banUserById('ghost-user', 'reason')).rejects.toThrow(
            'User not found'
        );
    });
});

// ── unbanUserById ─────────────────────────────────────────────────────

describe('unbanUserById', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(unbanUserById('user-2')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(unbanUserById('user-2')).rejects.toThrow('Forbidden');
    });

    it('throws User not found when target does not exist', async () => {
        mockAdmin('admin');

        // requireAdmin calls findUnique once.
        // Promise.all calls findUnique twice (acting user, target user).
        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user in Promise.all
            .mockResolvedValueOnce(null);              // target not found in Promise.all

        await expect(unbanUserById('ghost')).rejects.toThrow('User not found');
    });

    it('unbans user and writes audit log', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user
            .mockResolvedValueOnce({ name: 'Banned', email: 'b@test.com', role: 'user' }); // target user

        mockDb.user.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await unbanUserById('user-2');

        expect(result.success).toBe(true);
        expect(mockDb.user.update).toHaveBeenCalledWith(
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
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(activateUser('user-1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular admin (only superadmin can activate)', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }); // activateUser superadmin check

        await expect(activateUser('user-1')).rejects.toThrow('super-admins');
    });

    it('superadmin activates a pending user', async () => {
        mockAdmin('superadmin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'superadmin' }); // activateUser check

        mockDb.user.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await activateUser('user-1');

        expect(result.success).toBe(true);
        expect(mockDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: { pendingActivation: false, activationExpiresAt: null },
            })
        );
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'ACTIVATE_USER' }),
            })
        );
    });
});

// ── deleteReportedContent ─────────────────────────────────────────────

describe('deleteReportedContent', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(deleteReportedContent('POST', 'p1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(deleteReportedContent('POST', 'p1')).rejects.toThrow('Forbidden');
    });

    it('soft-deletes a POST', async () => {
        mockAdmin('superadmin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin
            .mockResolvedValueOnce({ role: 'superadmin' }); // acting user in deleteReportedContent

        mockDb.post.findUnique.mockResolvedValue({
            deleted: false,
            user: { role: 'user' },
        });
        mockDb.post.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await deleteReportedContent('POST', 'p1');

        expect(result.success).toBe(true);
        expect(mockDb.post.update).toHaveBeenCalledWith({
            where: { id: 'p1' },
            data: { deleted: true },
        });
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'DELETE_CONTENT' }),
            })
        );
    });

    it('soft-deletes a COMMENT', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockDb.comment.findUnique.mockResolvedValue({
            deleted: false,
            user: { role: 'user' },
        });
        mockDb.comment.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await deleteReportedContent('COMMENT', 'c1');
        expect(result.success).toBe(true);
        expect(mockDb.comment.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { deleted: true },
        });
    });

    it('soft-deletes a TOPIC', async () => {
        mockAdmin('superadmin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'superadmin' }) // requireAdmin
            .mockResolvedValueOnce({ role: 'superadmin' }); // acting user check

        mockDb.communityTopic.findUnique.mockResolvedValue({ deleted: false, user: { role: 'user' } });

        mockDb.communityTopic.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await deleteReportedContent('TOPIC', 'topic-1');
        expect(result.success).toBe(true);
        expect(mockDb.communityTopic.update).toHaveBeenCalledWith({
            where: { id: 'topic-1' },
            data: { deleted: true },
        });
    });

    it('soft-deletes a REPLY', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockDb.communityReply.findUnique.mockResolvedValue({
            deleted: false,
            user: { role: 'user' },
        });
        mockDb.communityReply.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await deleteReportedContent('REPLY', 'reply-1');
        expect(result.success).toBe(true);
        expect(mockDb.communityReply.update).toHaveBeenCalledWith({
            where: { id: 'reply-1' },
            data: { deleted: true },
        });
    });

    it('rejects content that is already deleted', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockDb.post.findUnique.mockResolvedValue({ deleted: true });
        mockDb.post.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        await expect(deleteReportedContent('POST', 'p1')).rejects.toThrow(
            'Content not found',
        );
        expect(mockDb.post.update).not.toHaveBeenCalled();
    });

    it('throws for unknown content type', async () => {
        mockAdmin('admin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' });

        mockDb.auditLog.create.mockResolvedValue({});

        await expect(deleteReportedContent('UNKNOWN', 'x1')).rejects.toThrow(
            'Unknown content type'
        );
    });
});

// ── applyRoleChange ───────────────────────────────────────────────────

describe('applyRoleChange', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));
        await expect(applyRoleChange('user-1', 'user', 'admin')).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular', 'user');
        mockDb.user.findUnique.mockResolvedValue({ role: 'user' });

        await expect(applyRoleChange('user-2', 'user', 'admin')).rejects.toThrow(
            'Forbidden'
        );
    });

    it('throws User not found when target does not exist', async () => {
        mockAdmin('admin');

        // requireAdmin calls findUnique once.
        // Promise.all calls findUnique twice (acting user, target user).
        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' }) // requireAdmin check
            .mockResolvedValueOnce({ role: 'admin' }) // acting user in Promise.all
            .mockResolvedValueOnce(null);              // target not found in Promise.all

        await expect(applyRoleChange('ghost', 'user', 'admin')).rejects.toThrow(
            'User not found'
        );
    });

    it('prevents an ordinary admin from granting an elevated role', async () => {
        mockAdmin('admin');
        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({
                name: 'User',
                email: 'user@test.com',
                role: 'user',
            });
        mockDb.user.update.mockResolvedValue({});

        await expect(
            applyRoleChange('user-1', 'user', 'superadmin'),
        ).rejects.toThrow('Forbidden');
        expect(mockDb.user.update).not.toHaveBeenCalled();
    });

    it('uses the persisted role instead of trusting the caller-provided old role', async () => {
        mockAdmin('admin');
        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({
                name: 'Administrator',
                email: 'admin@test.com',
                role: 'admin',
            });
        mockDb.user.update.mockResolvedValue({});

        await expect(
            applyRoleChange('admin-2', 'user', 'user'),
        ).rejects.toThrow('Forbidden');
        expect(mockDb.user.update).not.toHaveBeenCalled();
    });

    it('invalidates sessions, notifies user, and writes audit log', async () => {
        mockAdmin('superadmin');

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: 'superadmin' })
            .mockResolvedValueOnce({ role: 'superadmin' })
            .mockResolvedValueOnce({ name: 'User', email: 'user@test.com', role: 'user' });

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.notification.create.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await applyRoleChange('user-1', 'user', 'admin');

        expect(result.success).toBe(true);
        expect(mockDb.session.deleteMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
        });
        expect(mockDb.notification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user-1',
                type: 'SYSTEM',
            }),
        });
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'CHANGE_ROLE',
                    targetId: 'user-1',
                }),
            })
        );
    });
});