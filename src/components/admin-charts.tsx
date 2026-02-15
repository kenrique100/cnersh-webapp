"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    totalPosts: number;
    totalProjects: number;
    approvedProjects: number;
    rejectedProjects: number;
    pendingProjects: number;
    totalTopics: number;
    pendingReports: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminCharts({ stats }: { stats: AdminStats }) {
    const userPieData = [
        { name: "Active", value: stats.activeUsers },
        { name: "Banned", value: stats.bannedUsers },
    ].filter((d) => d.value > 0);

    const projectPieData = [
        { name: "Approved", value: stats.approvedProjects },
        { name: "Pending", value: stats.pendingProjects },
        { name: "Rejected", value: stats.rejectedProjects },
    ].filter((d) => d.value > 0);

    const contentBarData = [
        { name: "Posts", count: stats.totalPosts },
        { name: "Projects", count: stats.totalProjects },
        { name: "Discussions", count: stats.totalTopics },
        { name: "Reports", count: stats.pendingReports },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* User Distribution Pie */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        User Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {userPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={userPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {userPieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                            No user data
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Project Status Pie */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Project Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {projectPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={projectPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {projectPieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                            No project data
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Content Overview Bar Chart */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Content Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={contentBarData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
