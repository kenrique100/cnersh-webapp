import { authIsRequired } from "@/lib/auth-utils";
import { getAdminStats } from "@/app/actions/admin";
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
} from "lucide-react";
import AdminCharts from "@/components/admin-charts";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const isSuperAdmin = user?.role === "superadmin";
    const stats = await getAdminStats();

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: UsersIcon,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950",
            border: "border-blue-200 dark:border-blue-800",
        },
        {
            title: "Active Users",
            value: stats.activeUsers,
            icon: TrendingUpIcon,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950",
            border: "border-emerald-200 dark:border-emerald-800",
        },
        {
            title: "Banned Users",
            value: stats.bannedUsers,
            icon: AlertCircleIcon,
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-950",
            border: "border-red-200 dark:border-red-800",
        },
        {
            title: "Total Posts",
            value: stats.totalPosts,
            icon: FileTextIcon,
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50 dark:bg-violet-950",
            border: "border-violet-200 dark:border-violet-800",
        },
        {
            title: "Total Projects",
            value: stats.totalProjects,
            icon: FolderIcon,
            color: "text-orange-600 dark:text-orange-400",
            bg: "bg-orange-50 dark:bg-orange-950",
            border: "border-orange-200 dark:border-orange-800",
        },
        {
            title: "Approved Projects",
            value: stats.approvedProjects,
            icon: ShieldCheckIcon,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950",
            border: "border-emerald-200 dark:border-emerald-800",
        },
        {
            title: "Pending Projects",
            value: stats.pendingProjects,
            icon: FolderIcon,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950",
            border: "border-amber-200 dark:border-amber-800",
        },
        {
            title: "Discussions",
            value: stats.totalTopics,
            icon: MessageSquareIcon,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-950",
            border: "border-indigo-200 dark:border-indigo-800",
        },
        {
            title: "Pending Reports",
            value: stats.pendingReports,
            icon: FlagIcon,
            color: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-950",
            border: "border-rose-200 dark:border-rose-800",
        },
    ];

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                            <ActivityIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isSuperAdmin ? "Full platform overview and management" : "Platform overview and analytics"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card
                                key={stat.title}
                                className={`border ${stat.border} bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden`}
                            >
                                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                                        {stat.title}
                                    </CardTitle>
                                    <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <div className={`text-4xl font-bold ${stat.color}`}>
                                        {stat.value}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Charts Section */}
                <div className="mt-10">
                    <AdminCharts stats={stats} />
                </div>
            </div>
        </div>
    );
}
