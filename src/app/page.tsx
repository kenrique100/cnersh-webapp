import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { getPosts, getPublicPosts, getTrendingTags, getUserActivity } from "@/app/actions/feed";
import PublicFeedClient from "@/components/public-feed-client";
import FeedClient from "@/components/feed-client";
import Navbar from "@/components/navbar";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getPages } from "@/app/actions/page-actions";
import FeedLeftSidebar from "@/components/feed-left-sidebar";
import FeedRightSidebar from "@/components/feed-right-sidebar";
import ProjectTracker from "@/components/project-tracker";

export const dynamic = "force-dynamic";

export default async function Home() {
    const session = await authSession();

    // If authenticated, get user data and full interactive posts
    let navUser = null;
    let userGender: string | null = null;
    let notificationCount = 0;
    let authPosts: Awaited<ReturnType<typeof getPosts>>["posts"] = [];
    let isAdmin = false;

    // For unauthenticated users, get public posts
    let publicPosts: Awaited<ReturnType<typeof getPublicPosts>> = [];

    // Fetch dynamic pages for navbar and trending tags
    const [pages, trendingTags] = await Promise.all([
        getPages(),
        getTrendingTags(5),
    ]);

    // User activity for sidebar
    let userActivity: Awaited<ReturnType<typeof getUserActivity>> = [];

    if (session) {
        try {
            const [user, unreadCount, postsResult, activity] = await Promise.all([
                db.user.findUnique({
                    where: { id: session.user.id },
                    select: { name: true, email: true, image: true, role: true, gender: true },
                }),
                getUnreadNotificationCount(),
                getPosts(1, 20),
                getUserActivity(session.user.id, 8),
            ]);
            if (user) {
                navUser = { name: user.name, email: user.email, image: user.image, role: user.role };
                userGender = user.gender;
                isAdmin = user.role === "admin" || user.role === "superadmin";
            }
            notificationCount = unreadCount;
            authPosts = postsResult.posts;
            userActivity = activity;
        } catch (error) {
            // Graceful degradation: if auth data fetch fails (e.g., deleted user, DB error),
            // fall through to display public posts instead of crashing the homepage
            console.error("Error fetching authenticated homepage data:", error);
        }
    }

    // Fetch public posts as fallback if not authenticated or user data is missing
    if (!navUser) {
        publicPosts = await getPublicPosts(20);
    }

    return (
        <div className="min-h-screen bg-[#F3F2EF] dark:bg-gray-900">
            {/* Navbar */}
            <Navbar user={navUser} notificationCount={notificationCount} pages={pages} />

            <div className="mx-auto max-w-[1200px] px-2 sm:px-4 py-4 sm:py-6">
                <div className="flex gap-6 justify-center">
                    {/* Left Sidebar (hidden on mobile/tablet) */}
                    <aside className="hidden lg:block w-[225px] shrink-0 sticky top-[4.5rem] self-start">
                        {session && navUser ? (
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

                    {/* Main Feed Column */}
                    <main className="w-full max-w-[600px] min-w-0">
                        {/* Mobile Hero Banner - only for unauthenticated users */}
                        {!session && (
                            <div className="lg:hidden mb-4">
                                <Card className="border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl overflow-hidden">
                                    <CardContent className="py-4 text-center">
                                        <div className="flex justify-center mb-2">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md">
                                                <Image
                                                    src="/logo.png"
                                                    alt="CNERSH"
                                                    width={40}
                                                    height={40}
                                                    className="w-10 h-10 object-contain"
                                                    priority
                                                />
                                            </div>
                                        </div>
                                        <h1 className="text-lg font-bold text-white">Welcome to CNERSH</h1>
                                        <p className="text-xs text-blue-100 mt-1 mb-3">National Ethics Committee for Health Research on Humans</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <Link href="/sign-up">
                                                <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 text-xs font-medium">
                                                    Get Started
                                                </Button>
                                            </Link>
                                            <Link href="/sign-in">
                                                <Button size="sm" variant="outline" className="border-white text-white hover:bg-white/10 text-xs font-medium">
                                                    Sign In
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Feed Header */}
                        <div className="flex items-center gap-3 px-2 mb-4">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Community Feed</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                        </div>

                        {/* Feed: Interactive for authenticated users, read-only for guests */}
                        {session && navUser ? (
                            <FeedClient
                                initialPosts={JSON.parse(JSON.stringify(authPosts))}
                                currentUserId={session.user.id}
                                currentUserName={navUser.name}
                                currentUserImage={navUser.image}
                                isAdmin={isAdmin}
                            />
                        ) : (
                            <PublicFeedClient posts={JSON.parse(JSON.stringify(publicPosts))} />
                        )}
                    </main>

                    {/* Right Sidebar (hidden on mobile/tablet) */}
                    <aside className="hidden xl:block w-[300px] shrink-0 sticky top-[4.5rem] self-start">
                        <FeedRightSidebar trendingTags={trendingTags} userActivity={JSON.parse(JSON.stringify(userActivity))} isLoggedIn={!!session} />
                    </aside>
                </div>

                {/* Mobile Project Tracker - shown below feed on small screens */}
                <div className="xl:hidden pb-6 mt-4">
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <SearchIcon className="w-4 h-4 text-blue-600" />
                                Track Your Project
                            </CardTitle>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Enter your project tracking code to check status.
                            </p>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ProjectTracker />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    &copy; {new Date().getFullYear()} CNERSH - National Ethics Committee for Health Research on Humans. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}