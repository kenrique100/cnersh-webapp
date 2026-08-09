import type { authSession } from '@/lib/auth-utils';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        project: {},
        aARApplication: {},
        user: {},
        notification: {},
        auditLog: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';

import {
    startAARApplication,
    submitAARApplication,
    confirmAARReceipt,
    updateAARStatus,
    getAARApplication,
} from '@/app/actions/aar';

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

/**
 * Each Prisma table is replaced with a plain Record of jest.Mock functions
 * in beforeEach so we never hit Prisma's read-only property types.
 */
type MockTable = Record<string, jest.Mock>;

interface MockDb {
    project: MockTable;
    aARApplication: MockTable;
    user: MockTable;
    notification: MockTable;
    auditLog: MockTable;
}

const mockedDb = _db as unknown as MockDb;

/**
 * Satisfies the full better-auth session shape (including additionalFields
 * declared in auth.ts: gender, welcomeEmailSent, profession, title).
 * The `as` cast keeps tests resilient to future field additions.
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

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.project = {};
    mockedDb.aARApplication = {};
    mockedDb.user = {};
    mockedDb.notification = {};
    mockedDb.auditLog = {};
    // This is the critical step that fixes "X is not a function".

    ((_db as unknown) as MockDb).project = mockedDb.project;
    ((_db as unknown) as MockDb).aARApplication = mockedDb.aARApplication;
    ((_db as unknown) as MockDb).user = mockedDb.user;
    ((_db as unknown) as MockDb).notification = mockedDb.notification;
    ((_db as unknown) as MockDb).auditLog = mockedDb.auditLog;
});

describe('startAARApplication', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(startAARApplication('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws if protocol is not approved', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            status: 'SUBMITTED',
            userId: 'user-1',
            aarApplication: null,
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(startAARApplication('proj1')).rejects.toThrow(
            'approved protocols'
        );
    });

    it('throws if protocol is not found', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);

        await expect(startAARApplication('proj1')).rejects.toThrow('Protocol not found');
    });

    it('throws Forbidden if user is not owner or admin', async () => {
        mockSession('user-99');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            status: 'APPROVED',
            userId: 'user-1',
            aarApplication: null,
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(startAARApplication('proj1')).rejects.toThrow('Forbidden');
    });

    it('creates a DRAFT AAR application for the owner', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            status: 'APPROVED',
            userId: 'user-1',
            aarApplication: null,
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.aARApplication.create = jest
            .fn()
            .mockResolvedValue({ id: 'aar1', status: 'DRAFT' });

        const result = await startAARApplication('proj1');

        expect(result.status).toBe('DRAFT');
        expect(mockedDb.aARApplication.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    projectId: 'proj1',
                    applicantId: 'user-1',
                    status: 'DRAFT',
                }),
            })
        );
    });

    it('returns existing application if one already exists', async () => {
        mockSession('user-1');
        const existing = { id: 'aar-existing', status: 'SUBMITTED' };
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            status: 'APPROVED',
            userId: 'user-1',
            aarApplication: existing,
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.aARApplication.create = jest.fn();

        const result = await startAARApplication('proj1');

        expect(result).toEqual(existing);
        expect(mockedDb.aARApplication.create).not.toHaveBeenCalled();
    });

    it('allows admin to start AAR for any project', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: 'proj1',
            status: 'APPROVED_WITH_CONDITIONS',
            userId: 'user-1',
            aarApplication: null,
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.create = jest
            .fn()
            .mockResolvedValue({ id: 'aar2', status: 'DRAFT' });

        const result = await startAARApplication('proj1');

        expect(result.status).toBe('DRAFT');
    });
});

describe('submitAARApplication', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(submitAARApplication('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws if AAR application is not found', async () => {
        mockSession('user-1');
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue(null);

        await expect(submitAARApplication('proj1')).rejects.toThrow(
            'AAR application not found'
        );
    });

    it('throws if protocol is not approved', async () => {
        mockSession('user-1');
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'DRAFT',
            project: {
                id: 'proj1',
                title: 'Test',
                userId: 'user-1',
                status: 'SUBMITTED',
            },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(submitAARApplication('proj1')).rejects.toThrow(
            'approved protocols'
        );
    });

    it('throws if application is not in DRAFT status', async () => {
        mockSession('user-1');
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'SUBMITTED',
            project: {
                id: 'proj1',
                title: 'Test',
                userId: 'user-1',
                status: 'APPROVED',
            },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(submitAARApplication('proj1')).rejects.toThrow(
            'already been submitted'
        );
    });

    it('throws Forbidden for non-owner non-admin', async () => {
        mockSession('user-99');
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'DRAFT',
            project: {
                id: 'proj1',
                title: 'Test',
                userId: 'user-1',
                status: 'APPROVED',
            },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(submitAARApplication('proj1')).rejects.toThrow('Forbidden');
    });

    it('submits a DRAFT application successfully', async () => {
        mockSession('user-1');
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'DRAFT',
            project: {
                id: 'proj1',
                title: 'Test Protocol',
                userId: 'user-1',
                status: 'APPROVED',
            },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        const result = await submitAARApplication('proj1');

        expect(result.success).toBe(true);
        expect(mockedDb.aARApplication.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { projectId: 'proj1' },
                data: expect.objectContaining({ status: 'SUBMITTED' }),
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'AAR_SUBMITTED' }),
            })
        );
    });

    it('passes optional notes through to the update call', async () => {
        mockSession('user-1');
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'DRAFT',
            project: {
                id: 'proj1',
                title: 'Test',
                userId: 'user-1',
                status: 'APPROVED',
            },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        await submitAARApplication('proj1', 'Some notes');

        expect(mockedDb.aARApplication.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ notes: 'Some notes' }),
            })
        );
    });
});

describe('confirmAARReceipt', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(confirmAARReceipt('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden if user is not admin', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(confirmAARReceipt('proj1')).rejects.toThrow('Forbidden');
    });

    it('throws if application is not found', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue(null);

        await expect(confirmAARReceipt('proj1')).rejects.toThrow(
            'AAR application not found'
        );
    });

    it('throws if application is not in SUBMITTED status', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'DRAFT',
            project: { id: 'proj1', title: 'Project', userId: 'pi-1' },
        });

        await expect(confirmAARReceipt('proj1')).rejects.toThrow(
            'not been submitted yet'
        );
    });

    it('admin confirms receipt and returns a drosDueDate', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'SUBMITTED',
            project: { id: 'proj1', title: 'Project', userId: 'pi-1' },
        });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        const result = await confirmAARReceipt('proj1');

        expect(result.success).toBe(true);
        expect(result).toHaveProperty('drosDueDate');
        expect(typeof result.drosDueDate).toBe('string');

        expect(mockedDb.aARApplication.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { projectId: 'proj1' },
                data: expect.objectContaining({ status: 'RECEIVED_BY_DROS' }),
            })
        );
        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'PROJECT_STATUS',
                    userId: 'pi-1',
                }),
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'AAR_RECEIVED_BY_DROS' }),
            })
        );
    });

    it('superadmin can also confirm receipt', async () => {
        mockSession('super-1', 'Super');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'SUBMITTED',
            project: { id: 'proj1', title: 'Project', userId: 'pi-1' },
        });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        const result = await confirmAARReceipt('proj1');
        expect(result.success).toBe(true);
    });
});

describe('updateAARStatus', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(updateAARStatus('proj1', 'AUTHORIZED')).rejects.toThrow(
            'Unauthorized'
        );
    });

    it('throws Forbidden if user is not admin', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(updateAARStatus('proj1', 'AUTHORIZED')).rejects.toThrow('Forbidden');
    });

    it('throws if application is not found', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue(null);

        await expect(updateAARStatus('proj1', 'AUTHORIZED')).rejects.toThrow(
            'AAR application not found'
        );
    });

    it('throws if application is already INADMISSIBLE', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'INADMISSIBLE',
            project: { id: 'proj1', title: 'Project', userId: 'pi-1' },
        });

        await expect(updateAARStatus('proj1', 'AUTHORIZED')).rejects.toThrow(
            'inadmissible'
        );
    });

    it('updates status to AUTHORIZED and notifies PI', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'RECEIVED_BY_DROS',
            project: { id: 'proj1', title: 'Test Project', userId: 'pi-1' },
        });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        const result = await updateAARStatus('proj1', 'AUTHORIZED', {
            aarRefNumber: 'AAR-001',
        });

        expect(result.success).toBe(true);
        expect(mockedDb.aARApplication.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'AUTHORIZED',
                    aarRefNumber: 'AAR-001',
                }),
            })
        );
        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'PROJECT_STATUS',
                    userId: 'pi-1',
                }),
            })
        );
        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'AAR_STATUS_AUTHORIZED' }),
            })
        );
    });

    it('does not send notification for statuses without a message', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'RECEIVED_BY_DROS',
            project: { id: 'proj1', title: 'Test Project', userId: 'pi-1' },
        });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        // 'SUBMITTED' has no entry in statusMessages
        await updateAARStatus('proj1', 'SUBMITTED');

        expect(mockedDb.notification.create).not.toHaveBeenCalled();
    });

    it('sends CLARIFICATION_REQUESTED notification with correct message', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue({
            status: 'RECEIVED_BY_DROS',
            project: { id: 'proj1', title: 'My Protocol', userId: 'pi-1' },
        });
        mockedDb.aARApplication.update = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        await updateAARStatus('proj1', 'CLARIFICATION_REQUESTED');

        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'pi-1',
                    message: expect.stringContaining('clarification'),
                }),
            })
        );
    });
});

describe('getAARApplication', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getAARApplication('proj1')).rejects.toThrow('Unauthorized');
    });

    it('throws if project is not found', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);

        await expect(getAARApplication('proj1')).rejects.toThrow('Protocol not found');
    });

    it('throws Forbidden for non-owner non-admin', async () => {
        mockSession('user-99');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });

        await expect(getAARApplication('proj1')).rejects.toThrow('Forbidden');
    });

    it('returns application for the project owner', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.aARApplication.findUnique = jest
            .fn()
            .mockResolvedValue({ id: 'aar1', status: 'DRAFT' });

        const result = await getAARApplication('proj1');

        expect(result).toHaveProperty('id', 'aar1');
        expect(mockedDb.aARApplication.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { projectId: 'proj1' } })
        );
    });

    it('returns application for an admin', async () => {
        mockSession('admin-1', 'Admin');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.aARApplication.findUnique = jest
            .fn()
            .mockResolvedValue({ id: 'aar1', status: 'SUBMITTED' });

        const result = await getAARApplication('proj1');
        expect(result).toHaveProperty('id', 'aar1');
    });

    it('returns null when no AAR application exists for the project', async () => {
        mockSession('user-1');
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.aARApplication.findUnique = jest.fn().mockResolvedValue(null);

        const result = await getAARApplication('proj1');
        expect(result).toBeNull();
    });
});