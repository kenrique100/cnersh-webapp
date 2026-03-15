import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { getUserDashboardData } from "@/app/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    PenSquareIcon,
    FolderIcon,
    BellIcon,
    CheckCircle2Icon,
    ClockIcon,
    MessageSquareIcon,
    FileTextIcon,
    ArrowRightIcon,
    ActivityIcon,
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function statusColor(status: string) {
    switch (status) {
        case "APPROVED": return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950";
        case "REJECTED": return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
        case "SUBMITTED":
        case "PENDING_REVIEW": return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950";
        default: return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900";
    }
}

export default async function DashboardPage() {
    await authIsRequired();
    const user = await updateProfile();
    const data = await getUserDashboardData();

    const userInitials = user?.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || "U";

    const stats = data?.stats;

    const statCards = [
        {
            title: "My Posts",
            value: stats?.totalPosts ?? 0,
            icon: PenSquareIcon,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950",
        },
        {
            title: "Pending Protocols",
            value: stats?.pendingProjects ?? 0,
            icon: ClockIcon,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950",
        },
        {
            title: "Approved Protocols",
            value: stats?.approvedProjects ?? 0,
            icon: CheckCircle2Icon,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950",
        },
        {
            title: "Notifications",
            value: stats?.unreadNotifications ?? 0,
            icon: BellIcon,
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50 dark:bg-violet-950",
        },
    ];

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Profile Header */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg mb-4 sm:mb-6 overflow-hidden">
                    <div className="h-20 sm:h-28 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700" />
                    <CardContent className="relative pt-0 pb-4 sm:pb-5 px-3 sm:px-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4 -mt-8 sm:-mt-10">
                            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white dark:border-gray-950 shadow-lg">
                                <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                                <AvatarFallback className="bg-blue-700 text-white text-lg sm:text-xl font-bold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 pt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {user?.name || "Welcome"}
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <Link
                                href="/update-profile"
                                className="text-sm text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium shrink-0"
                            >
                                Edit Profile
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stat Cards */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card
                                key={stat.title}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow rounded-xl"
                            >
                                <CardContent className="flex items-center gap-2.5 sm:gap-4 p-3 sm:py-5">
                                    <div className={`flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl shrink-0 ${stat.bg}`}>
                                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                                            {stat.value}
                                        </p>
                                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{stat.title}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Recent Activity & Community Updates */}
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                    {/* Recent Activity */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ActivityIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        Recent Activity
                                    </CardTitle>
                                </div>
                                <Link href="/feeds" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                    View all <ArrowRightIcon className="h-3 w-3" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Recent Posts */}
                                {data?.recentPosts && data.recentPosts.length > 0 ? (
                                    data.recentPosts.map((post) => (
                                        <Link
                                            key={post.id}
                                            href="/feeds"
                                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 shrink-0 mt-0.5">
                                                <FileTextIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                                    {post.content.slice(0, 80)}{post.content.length > 80 ? "..." : ""}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                                                    <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
                                                    <span className="text-xs text-gray-400">{post._count.likes} likes</span>
                                                    <span className="text-xs text-gray-400">{post._count.comments} comments</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-gray-400">
                                        No recent posts yet.{" "}
                                        <Link href="/feeds" className="text-blue-600 hover:underline">Create one</Link>
                                    </div>
                                )}

                                {/* Recent Protocol Submissions */}
                                {data?.recentProjects && data.recentProjects.length > 0 && (
                                    <>
                                        <div className="border-t border-gray-100 dark:border-gray-800 my-2" />
                                        {data.recentProjects.map((project) => (
                                            <Link
                                                key={project.id}
                                                href={`/protocols/${project.id}`}
                                                className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                            >
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950 shrink-0 mt-0.5">
                                                    <FolderIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                                        {project.title}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor(project.status)}`}>
                                                            {project.status.replace("_", " ")}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{timeAgo(project.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Community Updates */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquareIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        Community Updates
                                    </CardTitle>
                                </div>
                                <Link href="/community" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                    View all <ArrowRightIcon className="h-3 w-3" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data?.recentCommunityTopics && data.recentCommunityTopics.length > 0 ? (
                                    data.recentCommunityTopics.map((topic) => (
                                        <Link
                                            key={topic.id}
                                            href="/community"
                                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 shrink-0 mt-0.5">
                                                <MessageSquareIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {topic.title}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                                                    <span className="text-xs text-gray-400">by {topic.user.name || "Unknown"}</span>
                                                    <span className="text-xs text-gray-400">{topic._count.replies} replies</span>
                                                    <span className="text-xs text-gray-400">{timeAgo(topic.createdAt)}</span>
                                                </div>
                                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                                                    {topic.category}
                                                </span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-gray-400">
                                        No community discussions yet.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 sm:mt-6">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Quick Actions
                    </h2>
                    <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
                        <Link href="/feeds">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-4 sm:py-5 text-center px-2">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 mb-2">
                                        <PenSquareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">Feeds</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Share &amp; interact</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/protocols/submit">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-4 sm:py-5 text-center px-2">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950 mb-2">
                                        <FolderIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">Submit Protocol</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">New submission</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/protocols">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-4 sm:py-5 text-center px-2">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 mb-2">
                                        <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">My Protocols</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track submissions</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/notifications">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-4 sm:py-5 text-center px-2">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 mb-2">
                                        <BellIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Stay updated</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
