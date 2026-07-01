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
        reviewAssignment: {},
        cOIDeclaration: {},
        auditLog: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';
import { notifyAdmins as _notifyAdmins } from '@/lib/notify-admins';

import {
    submitCOIDeclaration,
    getMyReviewAssignments,
} from '@/app/actions/coi';

// ── Typed mock references ─────────────────────────────────────────────

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;
const mockedNotifyAdmins = _notifyAdmins as jest.MockedFunction<typeof NotifyAdminsType>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    reviewAssignment: MockTable;
    cOIDeclaration: MockTable;
    auditLog: MockTable;
}

const mockedDb = _db as unknown as MockDb;

// ── Helpers ───────────────────────────────────────────────────────────

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.reviewAssignment = mockedDb.reviewAssignment;
    live.cOIDeclaration = mockedDb.cOIDeclaration;
    live.auditLog = mockedDb.auditLog;
}

function mockSession(userId = 'reviewer-1', name = 'Reviewer One'): void {
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

/** Builds a fully-shaped assignment mock object to avoid repetition. */
function buildAssignment(overrides: Partial<{
    id: string;
    reviewerId: string;
    status: string;
    coiDeclaration: object | null;
    project: object;
}> = {}) {
    return {
        id: 'assign-1',
        reviewerId: 'reviewer-1',
        status: 'PENDING_COI',
        coiDeclaration: null,
        project: {
            id: 'proj-1',
            title: 'Test Protocol',
            userId: 'pi-1',
        },
        ...overrides,
    };
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.reviewAssignment = {};
    mockedDb.cOIDeclaration = {};
    mockedDb.auditLog = {};

    syncDb();

    mockedNotifyAdmins.mockResolvedValue(undefined);
});

// ── submitCOIDeclaration ──────────────────────────────────────────────

describe('submitCOIDeclaration', () => {
    const BASE_INPUT = {
        assignmentId: 'assign-1',
        hasCOI: false,
    };

    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(submitCOIDeclaration(BASE_INPUT)).rejects.toThrow('Unauthorized');
    });

    it('throws if review assignment is not found', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(submitCOIDeclaration(BASE_INPUT)).rejects.toThrow(
            'Review assignment not found'
        );
    });

    it('throws Forbidden if caller is not the assigned reviewer', async () => {
        mockSession('other-user');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ reviewerId: 'reviewer-1' }));
        syncDb();

        await expect(submitCOIDeclaration(BASE_INPUT)).rejects.toThrow(
            'Forbidden: You can only submit your own COI declaration'
        );
    });

    it('throws if COI declaration already exists (immutability guard)', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(
            buildAssignment({ coiDeclaration: { id: 'coi-existing', hasCOI: false } })
        );
        syncDb();

        await expect(submitCOIDeclaration(BASE_INPUT)).rejects.toThrow(
            'COI declaration has already been submitted and cannot be changed'
        );
    });

    // ── hasCOI = false (no conflict) ───────────────────────────────────

    describe('when hasCOI is false (no conflict)', () => {
        it('creates declaration, sets assignment to ACTIVE, writes COI_CLEARED audit log', async () => {
            mockSession('reviewer-1');

            const declaredAt = new Date('2024-06-01T12:00:00.000Z');

            mockedDb.reviewAssignment.findUnique = jest
                .fn()
                .mockResolvedValue(buildAssignment());
            mockedDb.cOIDeclaration.create = jest.fn().mockResolvedValue({
                id: 'coi-1',
                hasCOI: false,
                declaredAt,
            });
            mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            const result = await submitCOIDeclaration({ assignmentId: 'assign-1', hasCOI: false });

            // Return value
            expect(result.id).toBe('coi-1');
            expect(result.hasCOI).toBe(false);
            expect(result.declaredAt).toBe(declaredAt.toISOString());

            // Declaration created with correct payload
            expect(mockedDb.cOIDeclaration.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        assignmentId: 'assign-1',
                        userId: 'reviewer-1',
                        hasCOI: false,
                        details: null,
                    }),
                })
            );

            // Assignment set to ACTIVE
            expect(mockedDb.reviewAssignment.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'assign-1' },
                    data: { status: 'ACTIVE' },
                })
            );

            // Correct audit log action
            expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: 'COI_CLEARED',
                        targetId: 'proj-1',
                        userId: 'reviewer-1',
                    }),
                })
            );

            // notifyAdmins should NOT be called when there is no COI
            expect(mockedNotifyAdmins).not.toHaveBeenCalled();
        });

        it('passes optional details through to the declaration', async () => {
            mockSession('reviewer-1');

            mockedDb.reviewAssignment.findUnique = jest
                .fn()
                .mockResolvedValue(buildAssignment());
            mockedDb.cOIDeclaration.create = jest.fn().mockResolvedValue({
                id: 'coi-2',
                hasCOI: false,
                declaredAt: new Date(),
            });
            mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            await submitCOIDeclaration({
                assignmentId: 'assign-1',
                hasCOI: false,
                details: 'No conflict with this research area.',
            });

            expect(mockedDb.cOIDeclaration.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        details: 'No conflict with this research area.',
                    }),
                })
            );
        });
    });

    // ── hasCOI = true (conflict declared) ─────────────────────────────

    describe('when hasCOI is true (conflict declared)', () => {
        it('creates declaration, sets assignment to EXCLUDED, notifies admins, writes COI_DECLARED audit log', async () => {
            mockSession('reviewer-1');

            const declaredAt = new Date('2024-06-02T09:00:00.000Z');

            mockedDb.reviewAssignment.findUnique = jest
                .fn()
                .mockResolvedValue(buildAssignment());
            mockedDb.cOIDeclaration.create = jest.fn().mockResolvedValue({
                id: 'coi-3',
                hasCOI: true,
                declaredAt,
            });
            mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            const result = await submitCOIDeclaration({
                assignmentId: 'assign-1',
                hasCOI: true,
                details: 'I co-authored a paper with the PI.',
            });

            // Return value
            expect(result.id).toBe('coi-3');
            expect(result.hasCOI).toBe(true);
            expect(result.declaredAt).toBe(declaredAt.toISOString());

            // Declaration created
            expect(mockedDb.cOIDeclaration.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        hasCOI: true,
                        details: 'I co-authored a paper with the PI.',
                    }),
                })
            );

            // Assignment set to EXCLUDED
            expect(mockedDb.reviewAssignment.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'assign-1' },
                    data: { status: 'EXCLUDED' },
                })
            );

            // notifyAdmins called with correct message
            expect(mockedNotifyAdmins).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'SYSTEM',
                    link: '/admin/protocol-review',
                    excludeUserId: 'reviewer-1',
                    message: expect.stringContaining(
                        'Reviewer declared a conflict of interest for protocol "Test Protocol"'
                    ),
                })
            );

            // Correct audit log action
            expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: 'COI_DECLARED',
                        targetId: 'proj-1',
                        userId: 'reviewer-1',
                    }),
                })
            );
        });

        it('stores null for details when not provided', async () => {
            mockSession('reviewer-1');

            mockedDb.reviewAssignment.findUnique = jest
                .fn()
                .mockResolvedValue(buildAssignment());
            mockedDb.cOIDeclaration.create = jest.fn().mockResolvedValue({
                id: 'coi-4',
                hasCOI: true,
                declaredAt: new Date(),
            });
            mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
            mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
            syncDb();

            await submitCOIDeclaration({ assignmentId: 'assign-1', hasCOI: true });

            expect(mockedDb.cOIDeclaration.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ details: null }),
                })
            );
        });
    });

    it('uses the correct assignmentId in the findUnique where clause', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ id: 'assign-42', reviewerId: 'reviewer-1' }));
        mockedDb.cOIDeclaration.create = jest.fn().mockResolvedValue({
            id: 'coi-5',
            hasCOI: false,
            declaredAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitCOIDeclaration({ assignmentId: 'assign-42', hasCOI: false });

        expect(mockedDb.reviewAssignment.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'assign-42' } })
        );
    });
});

// ── getMyReviewAssignments ────────────────────────────────────────────

describe('getMyReviewAssignments', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getMyReviewAssignments()).rejects.toThrow('Unauthorized');
    });

    it('returns assignments for the authenticated reviewer', async () => {
        mockSession('reviewer-1');

        const fakeAssignments = [
            {
                id: 'assign-1',
                reviewerId: 'reviewer-1',
                status: 'ACTIVE',
                createdAt: new Date('2024-05-01'),
                project: {
                    id: 'proj-1',
                    title: 'Protocol A',
                    category: 'Health',
                    status: 'PENDING_REVIEW',
                    trackingCode: 'CNERSH-2024-AAAA',
                    createdAt: new Date('2024-04-01'),
                },
                coiDeclaration: { id: 'coi-1', hasCOI: false, declaredAt: new Date() },
                evaluationReport: null,
            },
            {
                id: 'assign-2',
                reviewerId: 'reviewer-1',
                status: 'PENDING_COI',
                createdAt: new Date('2024-05-10'),
                project: {
                    id: 'proj-2',
                    title: 'Protocol B',
                    category: 'Research',
                    status: 'PENDING_REVIEW',
                    trackingCode: 'CNERSH-2024-BBBB',
                    createdAt: new Date('2024-04-15'),
                },
                coiDeclaration: null,
                evaluationReport: null,
            },
        ];

        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue(fakeAssignments);
        syncDb();

        const result = await getMyReviewAssignments();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('assign-1');
        expect(result[1].id).toBe('assign-2');
    });

    it('queries only assignments belonging to the authenticated user', async () => {
        mockSession('reviewer-99');

        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getMyReviewAssignments();

        expect(mockedDb.reviewAssignment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { reviewerId: 'reviewer-99' },
            })
        );
    });

    it('results are ordered by createdAt descending', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getMyReviewAssignments();

        expect(mockedDb.reviewAssignment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { createdAt: 'desc' },
            })
        );
    });

    it('returns empty array when reviewer has no assignments', async () => {
        mockSession('reviewer-new');

        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        const result = await getMyReviewAssignments();

        expect(result).toEqual([]);
    });

    it('includes coiDeclaration and evaluationReport in the query', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getMyReviewAssignments();

        // Verify the include shape contains the expected relations
        expect(mockedDb.reviewAssignment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    coiDeclaration: true,
                    evaluationReport: expect.objectContaining({
                        select: expect.objectContaining({
                            id: true,
                            status: true,
                            recommendation: true,
                            submittedAt: true,
                        }),
                    }),
                }),
            })
        );
    });
});