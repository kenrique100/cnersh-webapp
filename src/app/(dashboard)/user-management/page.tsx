import { auth } from "@/lib/auth";
import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import UserManagementForm, { Role } from "./user-client";

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
    const session = await authIsRequired();

    // Only admins can access user management
    let currentUser;
    try {
        currentUser = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
    } catch (error) {
        console.error("Error checking user role:", error);
        redirect("/dashboard");
    }

    if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const { users } = await auth.api.listUsers({
        query: {},
        headers: await headers(),
    });

    const hasDeletePermission = await auth.api.userHasPermission({
        body: {
            userId: session?.user.id,
            permission: {
                user: ["delete"],
            },
        },
    });

    if (!users) redirect("/sign-in");

    // Fetch additional user data (image, banned status) from DB
    const userIds = users.map((u: { id: string }) => u.id);
    const dbUsers = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, image: true, banned: true },
    });
    const dbUserMap = new Map<string, { id: string; image: string | null; banned: boolean | null }>(
        dbUsers.map((u: { id: string; image: string | null; banned: boolean | null }) => [u.id, u])
    );
    
    const formattedUsers = users
        .map((user) => {
            const dbUser = dbUserMap.get(user.id);
            return {
                id: user.id,
                name: user.name,
                role: user.role as Role,
                email: user.email,
                emailVerified: user.emailVerified,
                hasDeletePermission: hasDeletePermission.success,
                image: dbUser?.image || null,
                banned: dbUser?.banned || false,
            };
        })
        .filter((f) => {
            // Super admin can see all users (user, admin, superadmin)
            if (currentUser?.role === "superadmin") return true;
            // Admin can only see and manage regular users (not other admins or superadmins)
            return f.role === "user";
        });

    return (
        <div className="w-full p-6 shadow-lg mx-auto max-w-7xl min-h-dvh rounded-2xl h-full flex gap-6 justify-center items-start">
            <UserManagementForm users={formattedUsers} currentRole={currentUser?.role ?? "admin"} />
        </div>
    );
}