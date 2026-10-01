import type { Prisma } from "@/generated/prisma";

export const activeUserFilter = {
    banned: false,
} satisfies Prisma.UserWhereInput;

/**
 * Same as `activeUserFilter`, but scoped to one role.
 * Example: `activeUserWithRoleFilter("superadmin")`.
 */
export function activeUserWithRoleFilter(role: string): Prisma.UserWhereInput {
    return {
        role,
        banned: false,
    };
}