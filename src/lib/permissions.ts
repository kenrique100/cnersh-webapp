import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const userRole = ac.newRole({
    user: [],
});

export const adminRole = ac.newRole({
    user: ["list", "set-password", "update"],
});

export const superadminRole = ac.newRole({
    ...adminAc.statements,
});

export const roles = {
    user: userRole,
    admin: adminRole,
    superadmin: superadminRole,
} as const;

export type RoleName = keyof typeof roles;