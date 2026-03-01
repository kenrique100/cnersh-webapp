import { authIsRequired } from "@/lib/auth-utils";
import { getTopics, getCommunityUsers } from "@/app/actions/community";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import CommunityClient from "@/components/community-client";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
    const session = await authIsRequired();

    // Only admins and superadmins can access the community
    const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        redirect("/dashboard");
    }

    let topics: Awaited<ReturnType<typeof getTopics>>["topics"] = [];
    let users: Awaited<ReturnType<typeof getCommunityUsers>> = [];

    try {
        const [topicsResult, usersResult] = await Promise.all([
            getTopics(undefined, 1, 50),
            getCommunityUsers(),
        ]);

        topics = topicsResult.topics;
        users = usersResult;
    } catch (error) {
        console.error("Error loading community page data:", error);
    }

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F3F2EF] dark:bg-gray-900 px-2 sm:px-4 lg:px-6 py-4">
            <CommunityClient
                initialTopics={JSON.parse(JSON.stringify(topics))}
                users={JSON.parse(JSON.stringify(users))}
                isAdmin={true}
                currentUserId={session.user.id}
            />
        </div>
    );
}
