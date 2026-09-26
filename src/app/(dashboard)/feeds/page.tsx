import { authIsRequired } from "@/lib/auth-utils";
import { getPosts, getUserActivity, getUnreadPostCount } from "@/app/actions/feed";
import { db } from "@/lib/db";
import FeedClient from "@/components/feed-client";
import FeedLeftSidebar from "@/components/feed-left-sidebar";
import FeedRightSidebar from "@/components/feed-right-sidebar";

export const dynamic = "force-dynamic";

export default async function FeedsPage() {
    const session = await authIsRequired();

    let user: { role: string | null; name: string | null; image: string | null; email: string; gender: string | null } | null = null;
    let posts: Awaited<ReturnType<typeof getPosts>>["posts"] = [];
    let userActivity: Awaited<ReturnType<typeof getUserActivity>> = [];
    let unreadCount = 0;

    try {
        const [userData, postsResult, activity, unread] = await Promise.all([
            db.user.findUnique({
                where: { id: session.user.id },
                select: { role: true, name: true, image: true, email: true, gender: true },
            }),
            getPosts(1, 20),
            getUserActivity(8),
            getUnreadPostCount(),
        ]);
        user = userData;
        posts = postsResult.posts;
        userActivity = activity;
        unreadCount = unread;
    } catch (error) {
        console.error("Error fetching feeds page data:", error);
    }

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F3F2EF] dark:bg-gray-900">
            <div className="mx-auto max-w-300 px-1 sm:px-4 py-3 sm:py-6">
                <div className="flex gap-2 sm:gap-4 lg:gap-6 justify-center">
                    <aside className="hidden lg:block w-56.25 shrink-0 sticky top-18 self-start">
                        <FeedLeftSidebar
                            userName={user?.name}
                            userImage={user?.image}
                            userEmail={user?.email}
                            userGender={user?.gender}
                            userRole={user?.role}
                            isAdmin={isAdmin}
                        />
                    </aside>

                    <main className="w-full max-w-none sm:max-w-[600px] min-w-0">
                        <FeedClient
                            initialPosts={JSON.parse(JSON.stringify(posts))}
                            initialUnreadCount={unreadCount}
                            currentUserId={session.user.id}
                            currentUserName={user?.name}
                            currentUserImage={user?.image}
                            currentUserGender={user?.gender}
                            isAdmin={isAdmin}
                        />
                    </main>

                    <aside className="hidden xl:block w-[300px] shrink-0 sticky top-[4.5rem] self-start">
                        <FeedRightSidebar userActivity={JSON.parse(JSON.stringify(userActivity))} isLoggedIn />
                    </aside>
                </div>
            </div>
        </div>
    );
}