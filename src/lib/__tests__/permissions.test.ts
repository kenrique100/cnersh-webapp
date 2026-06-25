jest.mock('better-auth/plugins/access', () => ({
    createAccessControl: jest.fn(() => ({
        newRole: jest.fn((val) => val),
    })),
}));

jest.mock('better-auth/plugins/admin/access', () => ({
    defaultStatements: {},
    adminAc: { statements: {} },
}));

import { ac, roles, userRole, adminRole, superadminRole } from '@/lib/permissions';

describe('permissions', () => {
    it('exports ac', () => {
        expect(ac).toBeDefined();
    });

    it('exports roles with user, admin and superadmin keys', () => {
        expect(roles).toHaveProperty('user');
        expect(roles).toHaveProperty('admin');
        expect(roles).toHaveProperty('superadmin');
    });

    it('exports userRole', () => {
        expect(userRole).toBeDefined();
    });

    it('exports adminRole', () => {
        expect(adminRole).toBeDefined();
    });

    it('exports superadminRole', () => {
        expect(superadminRole).toBeDefined();
    });

    it('roles.user equals userRole', () => {
        expect(roles.user).toBe(userRole);
    });

    it('roles.admin equals adminRole', () => {
        expect(roles.admin).toBe(adminRole);
    });

    it('roles.superadmin equals superadminRole', () => {
        expect(roles.superadmin).toBe(superadminRole);
    });
});