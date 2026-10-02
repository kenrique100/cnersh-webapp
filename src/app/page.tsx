import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { getPosts, getPublicPosts, getUserActivity } from "@/app/actions/feed";
import PublicFeedClient from "@/components/public-feed-client";
import FeedClient from "@/components/feed-client";
import Navbar from "@/components/navbar";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getPages } from "@/app/actions/page-actions";
import FeedLeftSidebar from "@/components/feed-left-sidebar";
import UserStorageGuard from "@/components/user-storage-guard";
import FeedRightSidebar from "@/components/feed-right-sidebar";
import ProjectTracker from "@/components/project-tracker";

export const dynamic = "force-dynamic";

export default async function Home() {
    const session = await authSession();
    const isVerifiedSession = Boolean(session?.user?.emailVerified);

    let navUser: {
        name: string | null;
        email: string;
        image: string | null;
        gender: string | null;
        role: string | null;
    } | null = null;
    let userGender: string | null = null;
    let notificationCount = 0;
    let authPosts: Awaited<ReturnType<typeof getPosts>>["posts"] = [];
    let isAdmin = false;

    let publicPosts: Awaited<ReturnType<typeof getPublicPosts>> = [];

    // getPages() is served from the cached "pages" tag, so this is near-free
    // on every navigation that previously hit the DB.
    let pages: Awaited<ReturnType<typeof getPages>> = [];
    try {
        pages = await getPages();
    } catch (error) {
        console.error("Error fetching pages:", error);
    }

    let userActivity: Awaited<ReturnType<typeof getUserActivity>> = [];

    if (isVerifiedSession && session) {
        try {
            // The session already carries name / email / image / gender /
            // role, so no separate user query is needed.
            navUser = {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image ?? null,
                gender: session.user.gender ?? null,
                role: session.user.role ?? null,
            };
            userGender = navUser.gender;
            isAdmin = navUser.role === "admin" || navUser.role === "superadmin";

            // NOTE: `getUserActivity` takes no arguments in the current
            // action definition (the limit is hard-coded inside the action).
            const [unreadCount, postsResult, activity] = await Promise.all([
                getUnreadNotificationCount(),
                getPosts(1, 20),
                getUserActivity(),
            ]);

            notificationCount = unreadCount;
            authPosts = postsResult.posts;
            userActivity = activity;
        } catch (error) {
            console.error("Error fetching authenticated homepage data:", error);
        }
    }

    if (!navUser) {
        publicPosts = await getPublicPosts();
    }

    return (
        <div className="min-h-screen bg-[#F3F2EF] dark:bg-gray-900">
            <Navbar user={navUser} notificationCount={notificationCount} pages={pages} />
            {isVerifiedSession && session?.user?.id && (
                <UserStorageGuard userId={session.user.id} />
            )}

            <div className="mx-auto max-w-[1200px] px-1 sm:px-4 py-3 sm:py-6">
                <div className="flex gap-2 sm:gap-4 lg:gap-6 justify-center">
                    <aside className="hidden lg:block w-[225px] shrink-0 sticky top-[4.5rem] self-start">
                        {isVerifiedSession && session && navUser ? (
                            <FeedLeftSidebar
                                userName={navUser.name}
                                userImage={navUser.image}
                                userEmail={navUser.email}
                                userGender={userGender}
                                userRole={navUser.role}
                                isAdmin={isAdmin}
                            />
                        ) : (
                            <FeedLeftSidebar isGuest isAdmin={false} />
                        )}
                    </aside>

                    <main className="w-full max-w-none sm:max-w-[600px] min-w-0">
                        {!isVerifiedSession && (
                            <div className="lg:hidden mb-4">
                                <Card className="border border-blue-900 bg-blue-800 rounded-lg overflow-hidden">
                                    <CardContent className="py-5 text-left">
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-white shrink-0">
                                                <Image
                                                    src="/logo.png"
                                                    alt="CNERSH"
                                                    width={40}
                                                    height={40}
                                                    className="w-10 h-10 object-contain"
                                                    priority
                                                />
                                            </div>
                                            <div>
                                                <h1 className="text-lg font-bold text-white">
                                                    Ethical review for health research in Cameroon
                                                </h1>
                                                <p className="text-sm text-blue-100 mt-1">
                                                    CNERSH reviews research involving human participants to protect their rights, safety, and well-being.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4">
                                            <Button asChild size="sm" className="bg-white text-blue-800 hover:bg-blue-50 text-xs font-medium">
                                                <Link href="/sign-up">Create account</Link>
                                            </Button>
                                            <Button asChild size="sm" variant="outline" className="border-blue-200 bg-transparent text-white hover:bg-blue-900 text-xs font-medium">
                                                <Link href="/sign-in">Sign in</Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className="xl:hidden mb-4">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-lg">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <SearchIcon className="w-4 h-4 text-blue-600" />
                                        Track Your Protocol
                                    </CardTitle>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Enter your protocol tracking code to check status.
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <ProjectTracker />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex items-center gap-3 px-2 mb-4">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Community Feed</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                        </div>

                        {isVerifiedSession && session && navUser ? (
                            <FeedClient
                                initialPosts={JSON.parse(JSON.stringify(authPosts))}
                                currentUserId={session.user.id}
                                currentUserName={navUser.name}
                                currentUserImage={navUser.image}
                                currentUserGender={navUser.gender}
                                isAdmin={isAdmin}
                            />
                        ) : (
                            <PublicFeedClient posts={JSON.parse(JSON.stringify(publicPosts))} />
                        )}
                    </main>

                    <aside className="hidden xl:block w-[300px] shrink-0 sticky top-[4.5rem] self-start">
                        <FeedRightSidebar
                            userActivity={JSON.parse(JSON.stringify(userActivity))}
                            isLoggedIn={isVerifiedSession}
                        />
                    </aside>
                </div>
            </div>
        </div>
    );
}