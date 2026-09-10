import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { canManageRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import UserManagementClient, { Role } from "./user-client";
import { getUserManagementData } from "@/app/actions/admin";

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

    let managementData = null;
    try {
        managementData = await getUserManagementData();
    } catch (error) {
        console.error("Error fetching user management data:", error);
    }
    if (!managementData) redirect("/dashboard");

    const formattedUsers = managementData.users.map((user) => ({
        id: user.id,
        name: user.name || "Unnamed user",
        role: user.role as Role,
        email: user.email,
        emailVerified: user.emailVerified,
        hasDeletePermission: canManageRole(currentUser.role, user.role),
        image: user.image || null,
        banned: user.banned || false,
    }));

    return (
        <div className="w-full p-2 sm:p-4 lg:p-6 mx-auto max-w-7xl min-h-dvh">
            <UserManagementClient
                users={formattedUsers}
                currentRole={currentUser?.role ?? "admin"}
                managementData={managementData}
            />
        </div>
    );
}
