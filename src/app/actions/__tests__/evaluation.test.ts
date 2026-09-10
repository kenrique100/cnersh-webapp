import type { authSession } from '@/lib/auth-utils';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        reviewAssignment: {},
        evaluationReport: {},
        auditLog: {},
        project: {},
        user: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';

import {
    saveEvaluationDraft,
    submitEvaluationReport,
    getMyEvaluationReport,
    getProjectEvaluationReports,
} from '@/app/actions/evaluation';

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    reviewAssignment: MockTable;
    evaluationReport: MockTable;
    auditLog: MockTable;
    project: MockTable;
    user: MockTable;
}

const mockedDb = _db as unknown as MockDb;

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.reviewAssignment = mockedDb.reviewAssignment;
    live.evaluationReport = mockedDb.evaluationReport;
    live.auditLog = mockedDb.auditLog;
    live.project = mockedDb.project;
    live.user = mockedDb.user;
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

function buildAssignment(overrides: Partial<{
    id: string;
    reviewerId: string;
    status: string;
    coiDeclaration: object | null;
    evaluationReport: object | null;
    project: object;
}> = {}) {
    return {
        id: 'assign-1',
        reviewerId: 'reviewer-1',
        status: 'ACTIVE',
        coiDeclaration: { hasCOI: false },
        evaluationReport: null,
        project: { id: 'proj-1', title: 'Test Protocol' },
        ...overrides,
    };
}

const VALID_SCORES = {
    socialValue: 4,
    scientificValidity: 3,
    riskBenefitAnalysis: 4,
    participantSelection: 3,
    informedConsentProcess: 4,
    confidentialityDataProtection: 3,
    collaborativePartnership: 4,
    recommendation: 'FAVORABLE' as const,
};

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.reviewAssignment = {};
    mockedDb.evaluationReport = {};
    mockedDb.auditLog = {};
    mockedDb.project = {};
    mockedDb.user = {};

    syncDb();
});

describe('saveEvaluationDraft', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(saveEvaluationDraft('assign-1', {})).rejects.toThrow('Unauthorized');
    });

    it('throws if assignment not found', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(saveEvaluationDraft('assign-1', {})).rejects.toThrow(
            'Review assignment not found'
        );
    });

    it('throws Forbidden if caller is not the assigned reviewer', async () => {
        mockSession('other-user');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ reviewerId: 'reviewer-1' }));
        syncDb();

        await expect(saveEvaluationDraft('assign-1', {})).rejects.toThrow('Forbidden');
    });

    it('throws if assignment status is not ACTIVE', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ status: 'PENDING_COI' }));
        syncDb();

        await expect(saveEvaluationDraft('assign-1', {})).rejects.toThrow(
            'You must submit a no-COI declaration before evaluating a protocol'
        );
    });

    it('throws if evaluation report already submitted', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(
            buildAssignment({ evaluationReport: { id: 'report-1', status: 'SUBMITTED' } })
        );
        syncDb();

        await expect(saveEvaluationDraft('assign-1', {})).rejects.toThrow(
            'Evaluation report has already been submitted and cannot be edited'
        );
    });

    it('creates a new DRAFT report when none exists', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ evaluationReport: null }));
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'report-new',
            status: 'DRAFT',
        });
        syncDb();

        const result = await saveEvaluationDraft('assign-1', { socialValue: 3 });

        expect(result).toHaveProperty('id', 'report-new');
        expect(mockedDb.evaluationReport.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    assignmentId: 'assign-1',
                    reviewerId: 'reviewer-1',
                    socialValue: 3,
                    status: 'DRAFT',
                }),
            })
        );
        expect(mockedDb.evaluationReport.update).toBeUndefined();
    });

    it('updates the existing DRAFT report when one already exists', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(
            buildAssignment({ evaluationReport: { id: 'report-existing', status: 'DRAFT' } })
        );
        mockedDb.evaluationReport.update = jest.fn().mockResolvedValue({
            id: 'report-existing',
            status: 'DRAFT',
        });
        syncDb();

        const result = await saveEvaluationDraft('assign-1', { socialValue: 5 });

        expect(result).toHaveProperty('id', 'report-existing');
        expect(mockedDb.evaluationReport.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { assignmentId: 'assign-1' },
                data: expect.objectContaining({
                    reviewerId: 'reviewer-1',
                    socialValue: 5,
                    status: 'DRAFT',
                }),
            })
        );
    });

    it('serialises additionalCriteria as InputJsonValue', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'report-json',
            status: 'DRAFT',
        });
        syncDb();

        await saveEvaluationDraft('assign-1', {
            additionalCriteria: { customField: 'value', nested: { a: 1 } },
        });

        expect(mockedDb.evaluationReport.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    additionalCriteria: { customField: 'value', nested: { a: 1 } },
                }),
            })
        );
    });

    it('omits additionalCriteria from the payload when not provided', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'report-no-json',
            status: 'DRAFT',
        });
        syncDb();

        await saveEvaluationDraft('assign-1', { socialValue: 2 });

        const callArg = mockedDb.evaluationReport.create.mock.calls[0][0];
        expect(callArg.data.additionalCriteria).toBeUndefined();
    });
});

describe('submitEvaluationReport', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(submitEvaluationReport('assign-1', VALID_SCORES)).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws if assignment not found', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(submitEvaluationReport('assign-1', VALID_SCORES)).rejects.toThrow(
            'Review assignment not found'
        );
    });

    it('throws Forbidden if caller is not the assigned reviewer', async () => {
        mockSession('other-user');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ reviewerId: 'reviewer-1' }));
        syncDb();

        await expect(submitEvaluationReport('assign-1', VALID_SCORES)).rejects.toThrow(
            'Forbidden'
        );
    });

    it('throws if assignment is not ACTIVE', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ status: 'EXCLUDED' }));
        syncDb();

        await expect(submitEvaluationReport('assign-1', VALID_SCORES)).rejects.toThrow(
            'You must submit a no-COI declaration before evaluating a protocol'
        );
    });

    it('throws if evaluation report already submitted', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(
            buildAssignment({ evaluationReport: { id: 'r1', status: 'SUBMITTED' } })
        );
        syncDb();

        await expect(submitEvaluationReport('assign-1', VALID_SCORES)).rejects.toThrow(
            'Evaluation report has already been submitted'
        );
    });

    const REQUIRED_CRITERIA = [
        'socialValue',
        'scientificValidity',
        'riskBenefitAnalysis',
        'participantSelection',
        'informedConsentProcess',
        'confidentialityDataProtection',
        'collaborativePartnership',
    ] as const;

    for (const criterion of REQUIRED_CRITERIA) {
        it(`throws when "${criterion}" score is missing`, async () => {
            mockSession('reviewer-1');
            mockedDb.reviewAssignment.findUnique = jest
                .fn()
                .mockResolvedValue(buildAssignment());
            syncDb();

            // Fix L376: Remove unused `_omit` — build the object without the key directly
            const incomplete = Object.fromEntries(
                Object.entries(VALID_SCORES).filter(([k]) => k !== criterion)
            );

            await expect(submitEvaluationReport('assign-1', incomplete)).rejects.toThrow(
                `Score for "${criterion}" is required`
            );
        });
    }

    it('throws when recommendation is missing', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        syncDb();

        // Fix L376: Remove unused `_omit` — build the object without recommendation directly
        const withoutRecommendation = Object.fromEntries(
            Object.entries(VALID_SCORES).filter(([k]) => k !== 'recommendation')
        );

        await expect(
            submitEvaluationReport('assign-1', withoutRecommendation)
        ).rejects.toThrow('A recommendation is required');
    });

    it('creates a new SUBMITTED report when none exists and returns id + submittedAt', async () => {
        mockSession('reviewer-1');

        const submittedAt = new Date('2024-07-01T10:00:00.000Z');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment({ evaluationReport: null }));
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'report-submit',
            submittedAt,
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(1);
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(result.id).toBe('report-submit');
        expect(result.submittedAt).toBe(submittedAt.toISOString());

        expect(mockedDb.evaluationReport.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    assignmentId: 'assign-1',
                    reviewerId: 'reviewer-1',
                    status: 'SUBMITTED',
                    recommendation: 'FAVORABLE',
                }),
            })
        );
    });

    it('updates the existing DRAFT report when one already exists', async () => {
        mockSession('reviewer-1');

        const submittedAt = new Date('2024-07-02T08:00:00.000Z');

        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(
            buildAssignment({ evaluationReport: { id: 'report-draft', status: 'DRAFT' } })
        );
        mockedDb.evaluationReport.update = jest.fn().mockResolvedValue({
            id: 'report-draft',
            submittedAt,
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(1);
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(result.id).toBe('report-draft');
        expect(mockedDb.evaluationReport.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { assignmentId: 'assign-1' },
                data: expect.objectContaining({ status: 'SUBMITTED' }),
            })
        );
    });

    it('marks the assignment as COMPLETED after submission', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'r1',
            submittedAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(1);
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(mockedDb.reviewAssignment.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'assign-1' },
                data: { status: 'COMPLETED' },
            })
        );
    });

    it('does NOT update project status when fewer than 2 reports are submitted', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'r1',
            submittedAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(1);
        mockedDb.project.update = jest.fn();
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(mockedDb.project.update).not.toHaveBeenCalled();
    });

    it('marks project as REVIEW_COMPLETE when 2 or more reports are submitted', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'r2',
            submittedAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(2);
        mockedDb.project.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(mockedDb.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'proj-1' },
                data: expect.objectContaining({
                    status: 'REVIEW_COMPLETE',
                    statusHistory: expect.objectContaining({
                        create: expect.objectContaining({
                            status: 'REVIEW_COMPLETE',
                            changedBy: 'reviewer-1',
                            comment: '2 evaluation reports submitted',
                        }),
                    }),
                }),
            })
        );
    });

    it('also marks project REVIEW_COMPLETE when more than 2 reports exist', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'r3',
            submittedAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(3);
        mockedDb.project.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(mockedDb.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'REVIEW_COMPLETE',
                }),
            })
        );
    });

    it('writes EVALUATION_SUBMITTED audit log entry', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'r4',
            submittedAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(1);
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'EVALUATION_SUBMITTED',
                    targetId: 'proj-1',
                    userId: 'reviewer-1',
                    details: expect.stringContaining('Test Protocol'),
                }),
            })
        );
    });

    it('counts submitted evaluations against the correct project', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue(buildAssignment());
        mockedDb.evaluationReport.create = jest.fn().mockResolvedValue({
            id: 'r5',
            submittedAt: new Date(),
        });
        mockedDb.reviewAssignment.update = jest.fn().mockResolvedValue({});
        mockedDb.reviewAssignment.count = jest.fn().mockResolvedValue(1);
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        await submitEvaluationReport('assign-1', VALID_SCORES);

        expect(mockedDb.reviewAssignment.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    projectId: 'proj-1',
                    evaluationReport: { is: { status: 'SUBMITTED' } },
                }),
            })
        );
    });
});

describe('getMyEvaluationReport', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getMyEvaluationReport('assign-1')).rejects.toThrow('Unauthorized');
    });

    it('throws if assignment not found', async () => {
        mockSession('reviewer-1');
        mockedDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(getMyEvaluationReport('assign-1')).rejects.toThrow(
            'Assignment not found'
        );
    });

    it('throws Forbidden if caller is not the assigned reviewer', async () => {
        mockSession('other-user');
        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue({ reviewerId: 'reviewer-1' });
        syncDb();

        await expect(getMyEvaluationReport('assign-1')).rejects.toThrow('Forbidden');
    });

    it('returns the evaluation report for the reviewer', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue({ reviewerId: 'reviewer-1' });
        mockedDb.evaluationReport.findUnique = jest.fn().mockResolvedValue({
            id: 'report-1',
            status: 'DRAFT',
            assignmentId: 'assign-1',
        });
        syncDb();

        const result = await getMyEvaluationReport('assign-1');

        expect(result).toHaveProperty('id', 'report-1');
        expect(mockedDb.evaluationReport.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { assignmentId: 'assign-1' } })
        );
    });

    it('returns null when no report exists yet', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue({ reviewerId: 'reviewer-1' });
        mockedDb.evaluationReport.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        const result = await getMyEvaluationReport('assign-1');

        expect(result).toBeNull();
    });

    it('queries by the correct assignmentId', async () => {
        mockSession('reviewer-1');

        mockedDb.reviewAssignment.findUnique = jest
            .fn()
            .mockResolvedValue({ reviewerId: 'reviewer-1' });
        mockedDb.evaluationReport.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await getMyEvaluationReport('assign-99');

        expect(mockedDb.reviewAssignment.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'assign-99' } })
        );
        expect(mockedDb.evaluationReport.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { assignmentId: 'assign-99' } })
        );
    });
});

describe('getProjectEvaluationReports', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getProjectEvaluationReports('proj-1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for regular users', async () => {
        mockSession('user-1', 'Regular User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getProjectEvaluationReports('proj-1')).rejects.toThrow(
            'Forbidden: Evaluation reports are restricted to admin users'
        );
    });

    it('throws Forbidden for project owners (non-admin)', async () => {
        mockSession('pi-1', 'PI User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        syncDb();

        await expect(getProjectEvaluationReports('proj-1')).rejects.toThrow('Forbidden');
    });

    it('returns reports for admin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.evaluationReport.findMany = jest.fn().mockResolvedValue([
            {
                id: 'report-1',
                status: 'SUBMITTED',
                reviewer: { id: 'reviewer-1', name: 'Rev A', email: 'reva@test.com' },
            },
            {
                id: 'report-2',
                status: 'DRAFT',
                reviewer: { id: 'reviewer-2', name: 'Rev B', email: 'revb@test.com' },
            },
        ]);
        syncDb();

        const result = await getProjectEvaluationReports('proj-1');

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('id', 'report-1');
        expect(result[1]).toHaveProperty('id', 'report-2');
    });

    it('returns reports for superadmin', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.evaluationReport.findMany = jest.fn().mockResolvedValue([
            { id: 'report-3', status: 'SUBMITTED' },
        ]);
        syncDb();

        const result = await getProjectEvaluationReports('proj-1');

        expect(result).toHaveLength(1);
    });

    it('queries reports scoped to the given projectId', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.evaluationReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getProjectEvaluationReports('proj-42');

        expect(mockedDb.evaluationReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { assignment: { projectId: 'proj-42' } },
            })
        );
    });

    it('results are ordered by createdAt ascending', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.evaluationReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getProjectEvaluationReports('proj-1');

        expect(mockedDb.evaluationReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { createdAt: 'asc' } })
        );
    });

    it('includes reviewer name and email in the query', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.evaluationReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await getProjectEvaluationReports('proj-1');

        expect(mockedDb.evaluationReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    reviewer: expect.objectContaining({
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

    it('returns empty array when no reports exist for the project', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.evaluationReport.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        const result = await getProjectEvaluationReports('proj-empty');

        expect(result).toEqual([]);
    });
});