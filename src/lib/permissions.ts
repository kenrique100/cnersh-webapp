import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const userRole = ac.newRole({
    user: [],
});

/*
 * Better Auth's admin permissions are resource-wide: granting "update",
 * "ban", "set-password", or "set-role" lets an administrator invoke that
 * endpoint against every user, including a super-admin. Keep ordinary
 * administrators on the operations that are safe without a target-aware
 * policy. Targeted mutations are implemented by server actions that apply
 * the hierarchy helpers below.
 */
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

/**
 * Returns true when an actor may perform a target-aware administrative
 * mutation. Administrators may manage users; super-admins may additionally
 * manage administrators. No role may manage a peer or another super-admin.
 */
export function canManageRole(actorRole: unknown, targetRole: unknown): boolean {
    if (!isAdminRole(actorRole) || !isRoleName(targetRole)) return false;
    return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

/**
 * Role assignment is intentionally separate from target management. An
 * administrator may only keep/create the ordinary user role, while a
 * super-admin may grant any known role to a lower-tier account.
 */
export function canAssignRole(actorRole: unknown, newRole: unknown): newRole is RoleName {
    if (!isAdminRole(actorRole) || !isRoleName(newRole)) return false;
    return actorRole === "superadmin" || newRole === "user";
}
