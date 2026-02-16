import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheckIcon, UsersIcon, MegaphoneIcon, FolderIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { authSession, getDashboardPath } from "@/lib/auth-utils";
import { getPublicPosts } from "@/app/actions/feed";
import PublicFeedClient from "@/components/public-feed-client";

export default async function Home() {
    // Redirect authenticated users to their dashboard
    const session = await authSession();
    if (session) {
        redirect(getDashboardPath(session.user?.role));
    }

    // Fetch public posts for unauthenticated users
    const publicPosts = await getPublicPosts(20);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:bg-gray-950/80 dark:border-gray-800 shadow-sm">
                <div className="container mx-auto max-w-7xl">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Logo at Top Left */}
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white border border-gray-200 dark:border-gray-600 shadow-sm">
                                <Image
                                    src="/logo.png"
                                    alt="CNEC"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-contain"
                                    priority
                                />
                            </div>
                            <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-gray-100">
                                CNEC
                            </span>
                        </Link>

                        {/* Sign In and Sign Up buttons at Top Right */}
                        <div className="flex items-center gap-3">
                            <Link href="/sign-in">
                                <Button variant="ghost" className="text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/sign-up">
                                <Button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all">
                                    Sign Up
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-6 py-6">
                    {/* Left Sidebar - About & Features (hidden on mobile, shown on lg) */}
                    <aside className="hidden lg:block w-72 shrink-0 space-y-4">
                        {/* Logo & Welcome */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 pb-6 text-center">
                                <div className="flex justify-center mb-2">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md">
                                        <Image
                                            src="/logo.png"
                                            alt="CNEC Logo"
                                            width={56}
                                            height={56}
                                            className="w-14 h-14 object-contain"
                                            priority
                                        />
                                    </div>
                                </div>
                                <h1 className="text-lg font-bold text-white">CNEC</h1>
                                <p className="text-xs text-blue-100 mt-0.5">Cameroon National Ethics Community</p>
                            </div>
                            <CardContent className="pt-4 pb-3">
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    A secure platform for managing ethical review processes and community collaboration across Cameroon.
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
                        {/* Mobile Hero Banner */}
                        <div className="lg:hidden mb-4">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl overflow-hidden">
                                <CardContent className="py-4 text-center">
                                    <div className="flex justify-center mb-2">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md">
                                            <Image
                                                src="/logo.png"
                                                alt="CNEC"
                                                width={40}
                                                height={40}
                                                className="w-10 h-10 object-contain"
                                                priority
                                            />
                                        </div>
                                    </div>
                                    <h1 className="text-lg font-bold text-white">Welcome to CNEC</h1>
                                    <p className="text-xs text-blue-100 mt-1 mb-3">Cameroon National Ethics Community</p>
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

                        {/* Feed Header */}
                        <div className="flex items-center gap-3 px-2 mb-4">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Community Feed</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                        </div>

                        {/* Public Feed */}
                        <PublicFeedClient posts={JSON.parse(JSON.stringify(publicPosts))} />
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
                                        Sign up to start submitting projects and join discussions.
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

                        {/* About */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">About CNEC</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                    The Cameroon National Ethics Community is a platform dedicated to fostering ethical
                                    practices in research, policy-making, and community development.
                                </p>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNEC - Cameroon National Ethics Community. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}