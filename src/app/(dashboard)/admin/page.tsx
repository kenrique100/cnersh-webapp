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
} from "lucide-react";

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

    const stats = await getAdminStats();

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: UsersIcon,
            color: "text-blue-600 dark:text-blue-500",
            bg: "bg-blue-100 dark:bg-blue-900",
        },
        {
            title: "Active Users",
            value: stats.activeUsers,
            icon: TrendingUpIcon,
            color: "text-green-600 dark:text-green-500",
            bg: "bg-green-100 dark:bg-green-900",
        },
        {
            title: "Banned Users",
            value: stats.bannedUsers,
            icon: AlertCircleIcon,
            color: "text-red-600 dark:text-red-500",
            bg: "bg-red-100 dark:bg-red-900",
        },
        {
            title: "Total Posts",
            value: stats.totalPosts,
            icon: FileTextIcon,
            color: "text-purple-600 dark:text-purple-500",
            bg: "bg-purple-100 dark:bg-purple-900",
        },
        {
            title: "Total Projects",
            value: stats.totalProjects,
            icon: FolderIcon,
            color: "text-orange-600 dark:text-orange-500",
            bg: "bg-orange-100 dark:bg-orange-900",
        },
        {
            title: "Approved Projects",
            value: stats.approvedProjects,
            icon: ShieldCheckIcon,
            color: "text-green-600 dark:text-green-500",
            bg: "bg-green-100 dark:bg-green-900",
        },
        {
            title: "Pending Projects",
            value: stats.pendingProjects,
            icon: FolderIcon,
            color: "text-yellow-600 dark:text-yellow-500",
            bg: "bg-yellow-100 dark:bg-yellow-900",
        },
        {
            title: "Discussions",
            value: stats.totalTopics,
            icon: MessageSquareIcon,
            color: "text-indigo-600 dark:text-indigo-500",
            bg: "bg-indigo-100 dark:bg-indigo-900",
        },
        {
            title: "Pending Reports",
            value: stats.pendingReports,
            icon: FlagIcon,
            color: "text-red-600 dark:text-red-500",
            bg: "bg-red-100 dark:bg-red-900",
        },
    ];

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Admin Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Platform overview and analytics
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card
                                key={stat.title}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow hover:shadow-lg transition-shadow"
                            >
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {stat.title}
                                    </CardTitle>
                                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                                        <Icon className={`h-4 w-4 ${stat.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                        {stat.value}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
