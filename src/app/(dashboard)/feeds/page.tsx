import { authIsRequired } from "@/lib/auth-utils";
import { getPosts } from "@/app/actions/feed";
import { db } from "@/lib/db";
import FeedClient from "@/components/feed-client";

export const dynamic = "force-dynamic";

export default async function FeedsPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, name: true, image: true },
    });

    const { posts } = await getPosts(1, 20);

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
                <FeedClient
                    initialPosts={JSON.parse(JSON.stringify(posts))}
                    currentUserId={session.user.id}
                    currentUserName={user?.name}
                    currentUserImage={user?.image}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    );
}
