import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheckIcon, UsersIcon, MegaphoneIcon, FolderIcon, FileTextIcon, EyeIcon, TargetIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { getPosts, getPublicPosts } from "@/app/actions/feed";
import PublicFeedClient from "@/components/public-feed-client";
import FeedClient from "@/components/feed-client";
import Navbar from "@/components/navbar";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import PagesDropdown from "@/components/pages-dropdown";

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

    // Fetch dynamic pages for the sidebar (started early, awaited in parallel below)
    const dynamicPagesPromise = db.page.findMany({
        where: { parentId: null },
        select: {
            id: true,
            name: true,
            items: {
                select: { id: true, name: true, url: true, fileUrl: true },
                orderBy: { createdAt: "asc" },
            },
            children: {
                select: {
                    id: true,
                    name: true,
                    items: {
                        select: { id: true, name: true, url: true, fileUrl: true },
                        orderBy: { createdAt: "asc" },
                    },
                    children: {
                        select: {
                            id: true,
                            name: true,
                            items: {
                                select: { id: true, name: true, url: true, fileUrl: true },
                                orderBy: { createdAt: "asc" },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    if (session) {
        const [user, unreadCount, postsResult] = await Promise.all([
            db.user.findUnique({
                where: { id: session.user.id },
                select: { name: true, email: true, image: true, role: true, gender: true },
            }),
            getUnreadNotificationCount(),
            getPosts(1, 20),
        ]);
        if (user) {
            navUser = { name: user.name, email: user.email, image: user.image, role: user.role };
            userGender = user.gender;
            isAdmin = user.role === "admin" || user.role === "superadmin";
        }
        notificationCount = unreadCount;
        authPosts = postsResult.posts;
    } else {
        publicPosts = await getPublicPosts(20);
    }

    const dynamicPages = await dynamicPagesPromise;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Navbar - Use app navbar for all users (handles guest and authenticated states) */}
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-6 py-6">
                    {/* Left Sidebar (hidden on mobile, shown on lg) */}
                    <aside className="hidden lg:block w-72 shrink-0 space-y-4">
                        {session && navUser ? (
                            /* Authenticated: User Profile Card (LinkedIn-style) */
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-16" />
                                <div className="flex flex-col items-center -mt-8 pb-4 px-4">
                                    <div className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-950 overflow-hidden bg-gray-200 dark:bg-gray-700">
                                        {navUser.image ? (
                                            <Image
                                                src={navUser.image}
                                                alt={navUser.name || "Profile"}
                                                width={64}
                                                height={64}
                                                className="w-full h-full object-cover"
                                                {...(navUser.image.startsWith("data:") ? { unoptimized: true } : {})}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xl font-bold">
                                                {navUser.name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 text-center">
                                        {navUser.name || "User"}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate max-w-full">
                                        {navUser.email}
                                    </p>
                                    {userGender && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                                            {userGender}
                                        </p>
                                    )}
                                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                                        {navUser.role || "user"}
                                    </span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
                                    <Link href="/dashboard">
                                        <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs">
                                            Go to Dashboard
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ) : (
                            /* Guest: Welcome card with sign-in/sign-up */
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 pb-6 text-center">
                                    <div className="flex justify-center mb-2">
                                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md">
                                            <Image
                                                src="/logo.png"
                                                alt="CNERSH Logo"
                                                width={56}
                                                height={56}
                                                className="w-14 h-14 object-contain"
                                                priority
                                            />
                                        </div>
                                    </div>
                                    <h1 className="text-lg font-bold text-white">CNERSH</h1>
                                    <p className="text-xs text-blue-100 mt-0.5">National Ethics Committee for Health Research on Humans</p>
                                </div>
                                <CardContent className="pt-4 pb-3">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Reviews research proposals involving human participants to ensure they are ethically sound and compliant with relevant guidelines and regulations, protecting the rights, safety, and well-being of participants.
                                    </p>
                                    <div className="flex flex-col gap-2 mt-3">
                                        <Link href="/sign-up">
                                            <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs">
                                                Get Started
                                            </Button>
                                        </Link>
                                        <Link href="/sign-in">
                                            <Button size="sm" variant="outline" className="w-full text-xs">
                                                Sign In
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Features */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardContent className="py-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
                                        <ShieldCheckIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Secure Access</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Role-based access control</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
                                        <UsersIcon className="w-4 h-4 text-green-700 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Community</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Collaborate nationwide</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 shrink-0">
                                        <FolderIcon className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Project Submissions</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Submit for ethical review</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Main Feed Column */}
                    <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0">
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

                        {/* Our Pages - Mobile only (shown below feed on small screens) */}
                        <div className="lg:hidden mt-6">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <FileTextIcon className="w-4 h-4 text-purple-600" />
                                            Our Pages
                                        </CardTitle>
                                        <Link href="/pages" className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                            View All
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <PagesDropdown pages={JSON.parse(JSON.stringify(dynamicPages))} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Sidebar (hidden on mobile) */}
                    <aside className="hidden lg:block w-72 shrink-0 space-y-4">
                        {/* Announcements */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <MegaphoneIcon className="w-4 h-4 text-blue-600" />
                                    Announcements
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Platform Launch</p>
                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                                        CNERSH platform is live. Start submitting projects and join discussions.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Ethics Review</p>
                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                                        All projects undergo thorough ethical review before approval.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pages Card - Dynamic from DB */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <FileTextIcon className="w-4 h-4 text-purple-600" />
                                        Our Pages
                                    </CardTitle>
                                    <Link href="/pages" className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                        View All
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <PagesDropdown pages={JSON.parse(JSON.stringify(dynamicPages))} />
                            </CardContent>
                        </Card>

                        {/* About Us */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">About Us</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                    We are dedicated to ensuring the highest ethical standards in health research and clinical trials across Cameroon. Our commitment lies in safeguarding human participants, fostering transparency, and promoting integrity in every aspect of research.
                                </p>
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <EyeIcon className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100">Our Vision</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                        To be a globally recognized leader in ethical research governance, ensuring that all health research and clinical trials conducted in Cameroon adhere to the principles of integrity, accountability, and respect for human dignity, while fostering innovation and improving public health outcomes.
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <TargetIcon className="w-3.5 h-3.5 text-green-600" />
                                        <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100">Our Mission</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                        To uphold the highest ethical standards in health research and clinical trials in Cameroon by ensuring the protection of human participants, fostering transparency and integrity in research, and strengthening the ethical review process across regional and institutional levels. Through robust policy frameworks and collaboration, we strive to enhance public trust, advance scientific excellence, and contribute to an equitable and resilient health system.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </main>

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