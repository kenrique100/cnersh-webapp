import type { authSession } from '@/lib/auth-utils';
import type { notifyAdmins as NotifyAdminsType } from '@/lib/notify-admins';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/notify-admins', () => ({
    notifyAdmins: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        project: {},
        user: {},
        sAEReport: {},
        auditLog: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';
import { notifyAdmins as _notifyAdmins } from '@/lib/notify-admins';

import {
    reportSAE,
    getProjectSAEReports,
    getAllSAEReports,
} from '@/app/actions/sae';

// ── Typed mock references ─────────────────────────────────────────────

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;
const mockedNotifyAdmins = _notifyAdmins as jest.MockedFunction<typeof NotifyAdminsType>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    project: MockTable;
    user: MockTable;
    sAEReport: MockTable;
    auditLog: MockTable;
}

const mockedDb = _db as unknown as MockDb;

// ── Helpers ───────────────────────────────────────────────────────────

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.project = mockedDb.project;
    live.user = mockedDb.user;
    live.sAEReport = mockedDb.sAEReport;
    live.auditLog = mockedDb.auditLog;
}

function mockSession(userId = 'user-1', name = 'Test PI'): void {
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

/** Returns an event date that is within the 24-hour window (on-time). */
function recentEventDate(): string {
    return new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago
}

/** Returns an event date that exceeds the 24-hour window (late). */
function lateEventDate(): string {
    return new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
}

const BASE_SAE_INPUT = {
    projectId: 'proj-1',
    eventType: 'ADVERSE_EVENT' as const,
    eventDate: recentEventDate(),
    description: 'Patient experienced mild headache.',
    immediateActions: 'Administered paracetamol.',
};

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.project = {};
    mockedDb.user = {};
    mockedDb.sAEReport = {};
    mockedDb.auditLog = {};

    syncDb();

    mockedNotifyAdmins.mockResolvedValue(undefined);
});

// ── reportSAE ─────────────────────────────────────────────────────────

describe('reportSAE', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(reportSAE(BASE_SAE_INPUT)).rejects.toThrow('Unauthorized');
    });

    it('throws Protocol not found when project does not exist', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(reportSAE(BASE_SAE_INPUT)).rejects.toThrow('Protocol not found');
    });

    it('throws Forbidden if caller is neither owner nor admin', async () => {
        mockSession('user-99');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user', name: 'Other', email: 'other@test.com' });
        syncDb();

        await expect(reportSAE(BASE_SAE_INPUT)).rejects.toThrow(
            'Forbidden: Only the PI or admin can report SAEs'
        );
    });

    it('throws if project status is not in the allowed list', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'SUBMITTED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user', name: 'PI', email: 'pi@test.com' });
        syncDb();

        await expect(reportSAE(BASE_SAE_INPUT)).rejects.toThrow(
            'SAE reports can only be filed for approved protocols'
        );
    });

    it.each([
        'APPROVED',
        'APPROVED_WITH_CONDITIONS',
        'UNDER_APPEAL',
        'APPEAL_RESOLVED',
    ] as const)(
        'allows filing an SAE when project status is %s',
        async (status) => {
            mockSession('user-1');
            mockedDb.project.findUnique = jest.fn().mockResolvedValue({
                id: 'proj-1',
                title: 'Test Protocol',
                userId: 'user-1',
                status,
            });
            mockedDb.user.findUnique = jest.fn().mockResolvedValue({
                role: 'user',
                name: 'PI',
                email: 'pi@test.com',
            });
            mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
                id: 'sae-1',
                isLate: false,
                reportedAt: new Date(),
            });
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            const result = await reportSAE({ ...BASE_SAE_INPUT, eventDate: recentEventDate() });
            expect(result.id).toBe('sae-1');
        }
    );

    it('creates the SAE report with isLate false for a timely submission', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        const reportedAt = new Date();
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-timely',
            isLate: false,
            reportedAt,
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await reportSAE({
            ...BASE_SAE_INPUT,
            eventDate: recentEventDate(),
        });

        expect(result.id).toBe('sae-timely');
        expect(result.isLate).toBe(false);
        expect(result.reportedAt).toBe(reportedAt.toISOString());

        expect(mockedDb.sAEReport.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    projectId: 'proj-1',
                    reporterId: 'user-1',
                    eventType: 'ADVERSE_EVENT',
                    description: 'Patient experienced mild headache.',
                    immediateActions: 'Administered paracetamol.',
                    isLate: false,
                }),
            })
        );
    });

    it('creates the SAE report with isLate true for a late submission', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-late',
            isLate: true,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await reportSAE({
            ...BASE_SAE_INPUT,
            eventDate: lateEventDate(),
        });

        expect(result.isLate).toBe(true);

        expect(mockedDb.sAEReport.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ isLate: true }),
            })
        );
    });

    it('writes SAE_LATE_REPORT audit log AND SAE_REPORTED audit log for late submissions', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-late-log',
            isLate: true,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reportSAE({ ...BASE_SAE_INPUT, eventDate: lateEventDate() });

        // Two audit log entries: SAE_LATE_REPORT first, then SAE_REPORTED
        expect(mockedDb.auditLog.create).toHaveBeenCalledTimes(2);
        expect(mockedDb.auditLog.create).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'SAE_LATE_REPORT',
                    targetId: 'proj-1',
                    userId: 'user-1',
                }),
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'SAE_REPORTED',
                    targetId: 'proj-1',
                    userId: 'user-1',
                    details: expect.stringContaining('[LATE SUBMISSION]'),
                }),
            })
        );
    });

    it('writes only the SAE_REPORTED audit log for timely submissions', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-timely-log',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reportSAE({ ...BASE_SAE_INPUT, eventDate: recentEventDate() });

        expect(mockedDb.auditLog.create).toHaveBeenCalledTimes(1);
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'SAE_REPORTED' }),
            })
        );
    });

    it('notifies admins for every SAE submission', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-notify',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reportSAE({ ...BASE_SAE_INPUT, eventType: 'ADVERSE_EVENT', eventDate: recentEventDate() });

        expect(mockedNotifyAdmins).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'SYSTEM',
                link: '/admin/protocol-review',
                excludeUserId: 'user-1',
                message: expect.stringContaining('Test Protocol'),
            })
        );
    });

    it('sends a second URGENT notification for LIFE_THREATENING events', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-urgent',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reportSAE({
            ...BASE_SAE_INPUT,
            eventType: 'LIFE_THREATENING',
            eventDate: recentEventDate(),
        });

        // Called twice: standard + urgent
        expect(mockedNotifyAdmins).toHaveBeenCalledTimes(2);
        expect(mockedNotifyAdmins).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                message: expect.stringContaining('URGENT'),
            })
        );
    });

    it('sends a second URGENT notification for FATAL events', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-fatal',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reportSAE({
            ...BASE_SAE_INPUT,
            eventType: 'FATAL',
            eventDate: recentEventDate(),
        });

        expect(mockedNotifyAdmins).toHaveBeenCalledTimes(2);
        expect(mockedNotifyAdmins).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                message: expect.stringContaining('FATAL'),
            })
        );
    });

    it('does not send an urgent notification for non-critical event types', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-non-critical',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await reportSAE({
            ...BASE_SAE_INPUT,
            eventType: 'SERIOUS_ADVERSE_EVENT',
            eventDate: recentEventDate(),
        });

        // Only one notification: the standard one
        expect(mockedNotifyAdmins).toHaveBeenCalledTimes(1);
    });

    it('still returns successfully if notifyAdmins throws', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        const reportedAt = new Date();
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-notify-fail',
            isLate: false,
            reportedAt,
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        mockedNotifyAdmins.mockRejectedValue(new Error('Email failed'));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await reportSAE({ ...BASE_SAE_INPUT, eventDate: recentEventDate() });

        expect(result.id).toBe('sae-notify-fail');
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('stores null for immediateActions when not provided', async () => {
        mockSession('user-1');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1',
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'user',
            name: 'PI',
            email: 'pi@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-no-actions',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const { immediateActions: _omit, ...withoutActions } = BASE_SAE_INPUT;
        await reportSAE({ ...withoutActions, eventDate: recentEventDate() });

        expect(mockedDb.sAEReport.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ immediateActions: null }),
            })
        );
    });

    it('admin can report an SAE for a project they do not own', async () => {
        mockSession('admin-1', 'Admin User');

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'user-1', // owned by someone else
            status: 'APPROVED',
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            role: 'admin',
            name: 'Admin User',
            email: 'admin@test.com',
        });
        mockedDb.sAEReport.create = jest.fn().mockResolvedValue({
            id: 'sae-admin',
            isLate: false,
            reportedAt: new Date(),
        });
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await reportSAE({ ...BASE_SAE_INPUT, eventDate: recentEventDate() });
        expect(result.id).toBe('sae-admin');
    });
});

// ── getProjectSAEReports ──────────────────────────────────────────────

describe('getProjectSAEReports', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getProjectSAEReports('proj-1')).rejects.toThrow('Unauthorized');
    });

    it('throws Protocol not found when project does not exist', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(getProjectSAEReports('proj-1')).rejects.toThrow('Protocol not found');
    });

    it('throws Forbidden for unrelated regular users', async () => {
        mockSession('user-99');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getProjectSAEReports('proj-1')).rejects.toThrow('Forbidden');
    });

    it('returns SAE reports for the project owner', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([
            { id: 'sae-1', eventType: 'ADVERSE_EVENT', reporter: { id: 'user-1', name: 'PI', email: 'pi@test.com' } },
        ]);
        syncDb();

        const result = await getProjectSAEReports('proj-1');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('sae-1');
    });

    it('returns SAE reports for an admin user', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([
            { id: 'sae-2', eventType: 'FATAL', reporter: { id: 'user-1', name: 'PI', email: 'pi@test.com' } },
        ]);
        syncDb();

        const result = await getProjectSAEReports('proj-1');
        expect(result).toHaveLength(1);
    });

    it('queries reports scoped to the given projectId', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getProjectSAEReports('proj-42');

        expect(mockedDb.sAEReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { projectId: 'proj-42' },
            })
        );
    });

    it('orders results by reportedAt descending', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getProjectSAEReports('proj-1');

        expect(mockedDb.sAEReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { reportedAt: 'desc' },
            })
        );
    });

    it('includes reporter name and email', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getProjectSAEReports('proj-1');

        expect(mockedDb.sAEReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    reporter: expect.objectContaining({
                        select: expect.objectContaining({
                            id: true,
                            name: true,
                            email: true,
                        }),
                    }),
                }),
            })
        );
    });
});

// ── getAllSAEReports ───────────────────────────────────────────────────

describe('getAllSAEReports', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getAllSAEReports()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getAllSAEReports()).rejects.toThrow('Forbidden');
    });

    it('returns all SAE reports for admin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([
            {
                id: 'sae-a',
                eventType: 'ADVERSE_EVENT',
                project: { id: 'proj-1', title: 'Protocol A', trackingCode: 'CNERSH-2024-AAAA' },
                reporter: { id: 'user-1', name: 'PI A', email: 'pia@test.com' },
            },
            {
                id: 'sae-b',
                eventType: 'FATAL',
                project: { id: 'proj-2', title: 'Protocol B', trackingCode: 'CNERSH-2024-BBBB' },
                reporter: { id: 'user-2', name: 'PI B', email: 'pib@test.com' },
            },
        ]);
        syncDb();

        const result = await getAllSAEReports();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('sae-a');
        expect(result[1].id).toBe('sae-b');
    });

    it('returns all SAE reports for superadmin', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([
            { id: 'sae-c', eventType: 'LIFE_THREATENING' },
        ]);
        syncDb();

        const result = await getAllSAEReports();
        expect(result).toHaveLength(1);
    });

    it('orders results by reportedAt descending', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getAllSAEReports();

        expect(mockedDb.sAEReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { reportedAt: 'desc' },
            })
        );
    });

    it('includes project tracking code and reporter details', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getAllSAEReports();

        expect(mockedDb.sAEReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    project: expect.objectContaining({
                        select: expect.objectContaining({
                            id: true,
                            title: true,
                            trackingCode: true,
                        }),
                    }),
                    reporter: expect.objectContaining({
                        select: expect.objectContaining({
                            id: true,
                            name: true,
                            email: true,
                        }),
                    }),
                }),
            })
        );
    });

    it('returns empty array when no SAE reports exist', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.sAEReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        const result = await getAllSAEReports();
        expect(result).toEqual([]);
    });
});