import { auth } from "@/lib/auth";
import { authIsRequired } from "@/lib/auth-utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import UserManagementForm, { Role } from "./user-client";

export default async function UserManagementPage() {
    const session = await authIsRequired();

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
    
    const formattedUsers = users
        .map((user) => {
            return {
                id: user.id,
                name: user.name,
                role: user.role as Role,
                email: user.email,
                emailVerified: user.emailVerified,
                hasDeletePermission: hasDeletePermission.success,
            };
        })
        .filter((f) => ["user", "admin"].includes(f.role as Role));

    return (
        <div className="w-full p-6 shadow-lg mx-auto max-w-7xl min-h-dvh rounded-2xl h-full flex gap-6 justify-center items-start">
            <UserManagementForm users={formattedUsers} />
        </div>
    );
}