import { authIsRequired } from "@/lib/auth-utils";
import { getAdminDashboardData } from "@/app/actions/dashboard";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    UsersIcon,
    FileTextIcon,
    FolderIcon,
    MessageSquareIcon,
    FlagIcon,
    ShieldCheckIcon,
    TrendingUpIcon,
    AlertCircleIcon,
    ActivityIcon,
    ArrowRightIcon,
    ClockIcon,
    ScrollTextIcon,
} from "lucide-react";
import AdminCharts from "@/components/admin-charts";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

export default async function AdminOverviewPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const data = await getAdminDashboardData();
    if (!data) redirect("/dashboard");

    const { isSuperAdmin, stats } = data;

    const statCards = [
        {
            title: "Pending Protocols",
            value: stats.pendingProjects,
            icon: ClockIcon,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950",
            href: "/admin/protocol-review",
        },
        {
            title: "Approved Protocols",
            value: stats.approvedProjects,
            icon: ShieldCheckIcon,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950",
            href: "/admin/protocol-review",
        },
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: UsersIcon,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950",
            href: "/user-management",
        },
        {
            title: "Discussions",
            value: stats.totalTopics,
            icon: MessageSquareIcon,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-950",
            href: "/community",
        },
    ];

    // Additional stat cards for super admin
    const extraStatCards = isSuperAdmin
        ? [
            {
                title: "Active Users",
                value: stats.activeUsers,
                icon: TrendingUpIcon,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950",
                href: "/user-management",
            },
            {
                title: "Banned Users",
                value: stats.bannedUsers,
                icon: AlertCircleIcon,
                color: "text-red-600 dark:text-red-400",
                bg: "bg-red-50 dark:bg-red-950",
                href: "/user-management",
            },
            {
                title: "Total Posts",
                value: stats.totalPosts,
                icon: FileTextIcon,
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-950",
                href: "/admin/feed-moderation",
            },
            {
                title: "Pending Reports",
                value: stats.pendingReports,
                icon: FlagIcon,
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950",
                href: "/admin/reports",
            },
        ]
        : [
            {
                title: "Total Posts",
                value: stats.totalPosts,
                icon: FileTextIcon,
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-950",
                href: "/admin/feed-moderation",
            },
            {
                title: "Pending Reports",
                value: stats.pendingReports,
                icon: FlagIcon,
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950",
                href: "/admin/reports",
            },
        ];

    const allStatCards = [...statCards, ...extraStatCards];

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-blue-600 text-white">
                            <ActivityIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isSuperAdmin ? "Full platform overview and management" : "Platform overview and analytics"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className={`grid gap-4 grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} mb-6`}>
                    {allStatCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Link key={stat.title} href={stat.href}>
                                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow rounded-xl cursor-pointer">
                                    <CardContent className="flex items-center gap-4 py-5">
                                        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${stat.bg}`}>
                                            <Icon className={`w-5 h-5 ${stat.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                {stat.value}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.title}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                {/* Recent Activity & Community Updates */}
                <div className="grid gap-6 lg:grid-cols-2 mb-6">
                    {/* Recent Activity / Audit Logs */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ScrollTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        Recent Activity
                                    </CardTitle>
                                </div>
                                <Link href="/admin/audit-logs" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                    View all <ArrowRightIcon className="h-3 w-3" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.recentAuditLogs.length > 0 ? (
                                    data.recentAuditLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 mt-0.5">
                                                <ActivityIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                                    <span className="font-medium">{log.user.name || log.user.email}</span>{" "}
                                                    <span className="text-gray-500 dark:text-gray-400">{log.action.toLowerCase().replace(/_/g, " ")}</span>
                                                </p>
                                                {log.details && (
                                                    <p className="text-xs text-gray-400 truncate mt-0.5">{log.details}</p>
                                                )}
                                                <span className="text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-gray-400">
                                        No recent activity logs.
                                    </div>
                                )}

                                {/* Pending Protocols for quick review */}
                                {data.recentProjects.length > 0 && (
                                    <>
                                        <div className="border-t border-gray-100 dark:border-gray-800 my-2 pt-2">
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
                                                Pending Approvals
                                            </p>
                                        </div>
                                        {data.recentProjects.map((project) => (
                                            <Link
                                                key={project.id}
                                                href="/admin/protocol-review"
                                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                            >
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 shrink-0 mt-0.5">
                                                    <FolderIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                                        {project.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-gray-400">by {project.user.name || "Unknown"}</span>
                                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                            {project.status.replace("_", " ")}
                                                        </span>
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
                            <div className="space-y-2">
                                {data.recentCommunityTopics.length > 0 ? (
                                    data.recentCommunityTopics.map((topic) => (
                                        <Link
                                            key={topic.id}
                                            href="/community"
                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 shrink-0 mt-0.5">
                                                <MessageSquareIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {topic.title}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1">
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

                {/* Quick Actions for Admin */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Quick Actions
                    </h2>
                    <div className={`grid gap-3 grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
                        <Link href="/admin/protocol-review">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-5 text-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 mb-2">
                                        <ShieldCheckIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Review Protocols</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/user-management">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-5 text-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 mb-2">
                                        <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Manage Users</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/admin/feed-moderation">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-5 text-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 mb-2">
                                        <FileTextIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Moderate Feeds</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/admin/reports">
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                <CardContent className="flex flex-col items-center justify-center py-5 text-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 mb-2">
                                        <FlagIcon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">View Reports</p>
                                </CardContent>
                            </Card>
                        </Link>
                        {isSuperAdmin && (
                            <Link href="/admin/audit-logs">
                                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full rounded-xl">
                                    <CardContent className="flex flex-col items-center justify-center py-5 text-center">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 mb-2">
                                            <ScrollTextIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Audit Logs</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Charts Section (Super Admin gets full analytics) */}
                {isSuperAdmin && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                            Platform Analytics
                        </h2>
                        <AdminCharts stats={stats} />
                    </div>
                )}
            </div>
        </div>
    );
}
