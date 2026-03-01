import { authIsRequired } from "@/lib/auth-utils";
import { getPosts } from "@/app/actions/feed";
import { db } from "@/lib/db";
import FeedClient from "@/components/feed-client";
import FeedLeftSidebar from "@/components/feed-left-sidebar";
import FeedRightSidebar from "@/components/feed-right-sidebar";

export const dynamic = "force-dynamic";

export default async function FeedsPage() {
    const session = await authIsRequired();

    const [user, { posts }] = await Promise.all([
        db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, name: true, image: true },
        }),
        getPosts(1, 20),
    ]);

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F3F2EF] dark:bg-gray-900">
            <div className="mx-auto max-w-[1200px] px-4 py-6">
                <div className="flex gap-6 justify-center">
                    {/* Left Sidebar - Profile Summary (hidden on mobile/tablet) */}
                    <aside className="hidden lg:block w-[225px] shrink-0 sticky top-[4.5rem] self-start">
                        <FeedLeftSidebar
                            userName={user?.name}
                            userImage={user?.image}
                            isAdmin={isAdmin}
                        />
                    </aside>

                    {/* Main Feed Column */}
                    <main className="w-full max-w-[600px] min-w-0">
                        <FeedClient
                            initialPosts={JSON.parse(JSON.stringify(posts))}
                            currentUserId={session.user.id}
                            currentUserName={user?.name}
                            currentUserImage={user?.image}
                            isAdmin={isAdmin}
                        />
                    </main>

                    {/* Right Sidebar - Trending/Suggestions (hidden on mobile/tablet) */}
                    <aside className="hidden xl:block w-[300px] shrink-0 sticky top-[4.5rem] self-start">
                        <FeedRightSidebar />
                    </aside>
                </div>
            </div>
        </div>
    );
}
