import type { authSession } from '@/lib/auth-utils';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        user: {},
        reviewAssignment: {},
        committeeSession: {},
        project: {},
        projectStatusHistory: {},
        auditLog: {},
    },
}));


import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';

import {
    createCommitteeSession,
    getCommitteeSessions,
    updateSessionStatus,
} from '@/app/actions/session';

// ── Typed mock references ─────────────────────────────────────────────

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    reviewAssignment: MockTable;
    committeeSession: MockTable;
    project: MockTable;
    projectStatusHistory: MockTable;
    auditLog: MockTable;
}

const mockedDb = _db as unknown as MockDb;

// ── Helpers ───────────────────────────────────────────────────────────

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.user = mockedDb.user;
    live.reviewAssignment = mockedDb.reviewAssignment;
    live.committeeSession = mockedDb.committeeSession;
    live.project = mockedDb.project;
    live.projectStatusHistory = mockedDb.projectStatusHistory;
    live.auditLog = mockedDb.auditLog;
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

function mockAdmin(role: 'admin' | 'superadmin' = 'admin'): void {
    mockSession('admin-1', 'Admin User');
    mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role });
    syncDb();
}

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const BASE_SESSION_INPUT = {
    sessionType: 'ORDINARY' as const,
    sessionDate: FUTURE_DATE,
    venue: 'Conference Room A',
    notes: 'Quarterly review',
};

function buildCommitteeSession(overrides: Partial<{
    id: string;
    sessionType: string;
    sessionDate: Date;
    venue: string | null;
    agenda: string[];
    status: string;
    notes: string | null;
    quorumMet: boolean | null;
    minutes: string | null;
    createdBy: string;
}> = {}) {
    return {
        id: 'cs-1',
        sessionType: 'ORDINARY',
        sessionDate: new Date(FUTURE_DATE),
        venue: 'Conference Room A',
        agenda: [],
        status: 'SCHEDULED',
        quorumMet: null,
        minutes: null,
        notes: null,
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.user = {};
    mockedDb.reviewAssignment = {};
    mockedDb.committeeSession = {};
    mockedDb.project = {};
    mockedDb.projectStatusHistory = {};
    mockedDb.auditLog = {};

    syncDb();
});

// ── createCommitteeSession ────────────────────────────────────────────

describe('createCommitteeSession', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(createCommitteeSession(BASE_SESSION_INPUT)).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(createCommitteeSession(BASE_SESSION_INPUT)).rejects.toThrow(
            'Forbidden: Only admins can create committee sessions'
        );
    });

    it('creates a session with an empty agenda when no eligible protocols exist', async () => {
        mockAdmin('admin');

        // groupBy returns no groups with >= 2 completed reviews
        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ agenda: [] }));
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await createCommitteeSession(BASE_SESSION_INPUT);

        expect(result.agenda).toEqual([]);
        expect(mockedDb.committeeSession.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    sessionType: 'ORDINARY',
                    agenda: [],
                    status: 'SCHEDULED',
                    createdBy: 'admin-1',
                }),
            })
        );
        // project.updateMany and projectStatusHistory.createMany must NOT be called
        expect(mockedDb.project.updateMany).toBeUndefined();
        expect(mockedDb.projectStatusHistory.createMany).toBeUndefined();
    });

    it('filters out groups with fewer than 2 completed reviews', async () => {
        mockAdmin('admin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([
            { projectId: 'proj-a', _count: { _all: 1 } }, // only 1 review — excluded
            { projectId: 'proj-b', _count: { _all: 2 } }, // 2 reviews — included
        ]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ agenda: ['proj-b'] }));
        mockedDb.project.updateMany = jest.fn().mockResolvedValue({});
        mockedDb.projectStatusHistory.createMany = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await createCommitteeSession(BASE_SESSION_INPUT);

        expect(result.agenda).toEqual(['proj-b']);
        expect(mockedDb.committeeSession.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ agenda: ['proj-b'] }),
            })
        );
    });

    it('updates eligible project statuses to SESSION_SCHEDULED', async () => {
        mockAdmin('admin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([
            { projectId: 'proj-1', _count: { _all: 2 } },
            { projectId: 'proj-2', _count: { _all: 3 } },
        ]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ agenda: ['proj-1', 'proj-2'] }));
        mockedDb.project.updateMany = jest.fn().mockResolvedValue({});
        mockedDb.projectStatusHistory.createMany = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await createCommitteeSession(BASE_SESSION_INPUT);

        expect(mockedDb.project.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ['proj-1', 'proj-2'] } },
                data: { status: 'SESSION_SCHEDULED' },
            })
        );
    });

    it('creates status history entries for each eligible protocol', async () => {
        mockAdmin('admin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([
            { projectId: 'proj-1', _count: { _all: 2 } },
        ]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ agenda: ['proj-1'] }));
        mockedDb.project.updateMany = jest.fn().mockResolvedValue({});
        mockedDb.projectStatusHistory.createMany = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await createCommitteeSession(BASE_SESSION_INPUT);

        expect(mockedDb.projectStatusHistory.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        projectId: 'proj-1',
                        status: 'SESSION_SCHEDULED',
                        changedBy: 'admin-1',
                        comment: expect.stringContaining('Scheduled for committee session'),
                    }),
                ]),
            })
        );
    });

    it('writes a SESSION_CREATED audit log entry', async () => {
        mockAdmin('admin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([]);
        const fakeSession = buildCommitteeSession({ id: 'cs-audit' });
        mockedDb.committeeSession.create = jest.fn().mockResolvedValue(fakeSession);
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await createCommitteeSession(BASE_SESSION_INPUT);

        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'SESSION_CREATED',
                    targetId: 'cs-audit',
                    userId: 'admin-1',
                    details: expect.stringContaining('ORDINARY'),
                }),
            })
        );
    });

    it('stores null for venue when not provided', async () => {
        mockAdmin('admin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ venue: null }));
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const { venue: _omit, ...withoutVenue } = BASE_SESSION_INPUT;
        await createCommitteeSession(withoutVenue);

        expect(mockedDb.committeeSession.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ venue: null }),
            })
        );
    });

    it('superadmin can also create a committee session', async () => {
        mockAdmin('superadmin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession());
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await createCommitteeSession(BASE_SESSION_INPUT);
        expect(result.id).toBe('cs-1');
    });

    it('queries groupBy with the correct COMPLETED + SUBMITTED filter', async () => {
        mockAdmin('admin');

        mockedDb.reviewAssignment.groupBy = jest.fn().mockResolvedValue([]);
        mockedDb.committeeSession.create = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession());
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await createCommitteeSession(BASE_SESSION_INPUT);

        expect(mockedDb.reviewAssignment.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by: ['projectId'],
                where: expect.objectContaining({
                    status: 'COMPLETED',
                    evaluationReport: { status: 'SUBMITTED' },
                }),
            })
        );
    });
});

// ── getCommitteeSessions ──────────────────────────────────────────────

describe('getCommitteeSessions', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getCommitteeSessions()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getCommitteeSessions()).rejects.toThrow('Forbidden');
    });

    it('returns all sessions when no status filter is provided', async () => {
        mockAdmin('admin');

        const fakeSessions = [
            buildCommitteeSession({ id: 'cs-1', status: 'SCHEDULED' }),
            buildCommitteeSession({ id: 'cs-2', status: 'COMPLETED' }),
        ];
        mockedDb.committeeSession.findMany = jest.fn().mockResolvedValue(fakeSessions);
        syncDb();

        const result = await getCommitteeSessions();

        expect(result).toHaveLength(2);
        expect(mockedDb.committeeSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: undefined,
                orderBy: { sessionDate: 'desc' },
            })
        );
    });

    it('filters sessions by status when provided', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.findMany = jest
            .fn()
            .mockResolvedValue([buildCommitteeSession({ status: 'SCHEDULED' })]);
        syncDb();

        const result = await getCommitteeSessions('SCHEDULED');

        expect(result).toHaveLength(1);
        expect(mockedDb.committeeSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: 'SCHEDULED' },
            })
        );
    });

    it('orders results by sessionDate descending', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getCommitteeSessions();

        expect(mockedDb.committeeSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { sessionDate: 'desc' } })
        );
    });

    it('returns empty array when no sessions match the filter', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        const result = await getCommitteeSessions('COMPLETED');
        expect(result).toEqual([]);
    });

    it('superadmin can also retrieve sessions', async () => {
        mockAdmin('superadmin');

        mockedDb.committeeSession.findMany = jest
            .fn()
            .mockResolvedValue([buildCommitteeSession()]);
        syncDb();

        const result = await getCommitteeSessions();
        expect(result).toHaveLength(1);
    });
});

// ── updateSessionStatus ───────────────────────────────────────────────

describe('updateSessionStatus', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(updateSessionStatus('cs-1', 'IN_PROGRESS')).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(updateSessionStatus('cs-1', 'IN_PROGRESS')).rejects.toThrow(
            'Forbidden'
        );
    });

    it('updates the session status without optional data fields', async () => {
        mockAdmin('admin');

        const updatedSession = buildCommitteeSession({ status: 'IN_PROGRESS' });
        mockedDb.committeeSession.update = jest.fn().mockResolvedValue(updatedSession);
        syncDb();

        const result = await updateSessionStatus('cs-1', 'IN_PROGRESS');

        expect(result.status).toBe('IN_PROGRESS');
        expect(mockedDb.committeeSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'cs-1' },
                data: expect.objectContaining({ status: 'IN_PROGRESS' }),
            })
        );
    });

    it('includes quorumMet in the update when provided', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.update = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ status: 'COMPLETED', quorumMet: true }));
        syncDb();

        await updateSessionStatus('cs-1', 'COMPLETED', { quorumMet: true });

        expect(mockedDb.committeeSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ quorumMet: true }),
            })
        );
    });

    it('includes minutes in the update when provided', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.update = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ status: 'COMPLETED', minutes: 'Meeting notes here.' }));
        syncDb();

        await updateSessionStatus('cs-1', 'COMPLETED', { minutes: 'Meeting notes here.' });

        expect(mockedDb.committeeSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ minutes: 'Meeting notes here.' }),
            })
        );
    });

    it('includes notes in the update when provided', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.update = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ status: 'POSTPONED', notes: 'Rescheduled.' }));
        syncDb();

        await updateSessionStatus('cs-1', 'POSTPONED', { notes: 'Rescheduled.' });

        expect(mockedDb.committeeSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ notes: 'Rescheduled.' }),
            })
        );
    });

    it('does not include quorumMet when undefined', async () => {
        mockAdmin('admin');

        mockedDb.committeeSession.update = jest
            .fn()
            .mockResolvedValue(buildCommitteeSession({ status: 'COMPLETED' }));
        syncDb();

        await updateSessionStatus('cs-1', 'COMPLETED', {});

        const callArg = mockedDb.committeeSession.update.mock.calls[0][0];
        expect(callArg.data).not.toHaveProperty('quorumMet');
    });

    // ── CANCELLED branch ──────────────────────────────────────────────

    describe('when status is CANCELLED', () => {
        it('writes a SESSION_CANCELLED audit log', async () => {
            mockAdmin('admin');

            mockedDb.committeeSession.update = jest
                .fn()
                .mockResolvedValue(buildCommitteeSession({ status: 'CANCELLED', agenda: [] }));
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            await updateSessionStatus('cs-1', 'CANCELLED', { notes: 'No quorum.' });

            expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: 'SESSION_CANCELLED',
                        targetId: 'cs-1',
                        userId: 'admin-1',
                        details: expect.stringContaining('No quorum.'),
                    }),
                })
            );
        });

        it('falls back to "No reason provided." in audit log when no notes given', async () => {
            mockAdmin('admin');

            mockedDb.committeeSession.update = jest
                .fn()
                .mockResolvedValue(buildCommitteeSession({ status: 'CANCELLED', agenda: [] }));
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            await updateSessionStatus('cs-1', 'CANCELLED');

            expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        details: expect.stringContaining('No reason provided.'),
                    }),
                })
            );
        });

        it('reverts agenda project statuses to REVIEW_COMPLETE when agenda is non-empty', async () => {
            mockAdmin('admin');

            mockedDb.committeeSession.update = jest.fn().mockResolvedValue(
                buildCommitteeSession({
                    status: 'CANCELLED',
                    agenda: ['proj-1', 'proj-2'],
                })
            );
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            mockedDb.project.updateMany = jest.fn().mockResolvedValue({});
            mockedDb.projectStatusHistory.createMany = jest.fn().mockResolvedValue({});
            syncDb();

            await updateSessionStatus('cs-1', 'CANCELLED');

            expect(mockedDb.project.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: { in: ['proj-1', 'proj-2'] } },
                    data: { status: 'REVIEW_COMPLETE' },
                })
            );
        });

        it('creates REVIEW_COMPLETE status history entries for each agenda project', async () => {
            mockAdmin('admin');

            mockedDb.committeeSession.update = jest.fn().mockResolvedValue(
                buildCommitteeSession({
                    status: 'CANCELLED',
                    agenda: ['proj-1'],
                })
            );
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            mockedDb.project.updateMany = jest.fn().mockResolvedValue({});
            mockedDb.projectStatusHistory.createMany = jest.fn().mockResolvedValue({});
            syncDb();

            await updateSessionStatus('cs-1', 'CANCELLED');

            expect(mockedDb.projectStatusHistory.createMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            projectId: 'proj-1',
                            status: 'REVIEW_COMPLETE',
                            changedBy: 'admin-1',
                            comment: expect.stringContaining('Session cancelled'),
                        }),
                    ]),
                })
            );
        });

        it('does NOT update projects or status history when agenda is empty', async () => {
            mockAdmin('admin');

            mockedDb.committeeSession.update = jest.fn().mockResolvedValue(
                buildCommitteeSession({ status: 'CANCELLED', agenda: [] })
            );
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            mockedDb.project.updateMany = jest.fn();
            mockedDb.projectStatusHistory.createMany = jest.fn();
            syncDb();

            await updateSessionStatus('cs-1', 'CANCELLED');

            expect(mockedDb.project.updateMany).not.toHaveBeenCalled();
            expect(mockedDb.projectStatusHistory.createMany).not.toHaveBeenCalled();
        });

        it('does NOT write audit log or revert projects for non-CANCELLED statuses', async () => {
            mockAdmin('admin');

            mockedDb.committeeSession.update = jest.fn().mockResolvedValue(
                buildCommitteeSession({ status: 'COMPLETED', agenda: ['proj-1'] })
            );
            mockedDb.auditLog.create = jest.fn();
            mockedDb.project.updateMany = jest.fn();
            mockedDb.projectStatusHistory.createMany = jest.fn();
            syncDb();

            await updateSessionStatus('cs-1', 'COMPLETED');

            expect(mockedDb.auditLog.create).not.toHaveBeenCalled();
            expect(mockedDb.project.updateMany).not.toHaveBeenCalled();
            expect(mockedDb.projectStatusHistory.createMany).not.toHaveBeenCalled();
        });
    });
});