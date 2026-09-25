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
    user: ["list", "create"],
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

const ROLE_LEVEL: Record<RoleName, number> = {
    user: 0,
    admin: 1,
    superadmin: 2,
};

export function isRoleName(role: unknown): role is RoleName {
    return typeof role === "string" && Object.prototype.hasOwnProperty.call(ROLE_LEVEL, role);
}

export function isAdminRole(role: unknown): role is "admin" | "superadmin" {
    return role === "admin" || role === "superadmin";
}

export function canManageRole(actorRole: unknown, targetRole: unknown): boolean {
    if (!isAdminRole(actorRole) || !isRoleName(targetRole)) return false;
    return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

export function canAssignRole(actorRole: unknown, newRole: unknown): newRole is RoleName {
    if (!isAdminRole(actorRole) || !isRoleName(newRole)) return false;
    return actorRole === "superadmin" || newRole === "user";
}

export const AUTO_ASSIGNABLE_ROLES = ["admin"] as const;
export type AutoAssignableRole = (typeof AUTO_ASSIGNABLE_ROLES)[number];

export function isAutoAssignableRole(role: unknown): role is AutoAssignableRole {
    return (
        typeof role === "string" &&
        (AUTO_ASSIGNABLE_ROLES as readonly string[]).includes(role)
    );
}