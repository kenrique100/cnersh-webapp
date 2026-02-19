import { authIsRequired } from "@/lib/auth-utils";
import { getTopics, getCommunityUsers } from "@/app/actions/community";
import { db } from "@/lib/db";
import CommunityClient from "@/components/community-client";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
    const session = await authIsRequired();

    let topics: Awaited<ReturnType<typeof getTopics>>["topics"] = [];
    let users: Awaited<ReturnType<typeof getCommunityUsers>> = [];
    let isAdmin = false;

    try {
        const [topicsResult, usersResult, user] = await Promise.all([
            getTopics(undefined, 1, 50),
            getCommunityUsers(),
            db.user.findUnique({
                where: { id: session.user.id },
                select: { role: true },
            }),
        ]);

        topics = topicsResult.topics;
        users = usersResult;
        isAdmin = user?.role === "admin" || user?.role === "superadmin";
    } catch (error) {
        console.error("Error loading community page data:", error);
    }

    return (
        <CommunityClient
            initialTopics={JSON.parse(JSON.stringify(topics))}
            users={JSON.parse(JSON.stringify(users))}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
        />
    );
}
