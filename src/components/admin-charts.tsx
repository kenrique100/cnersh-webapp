"use client";

import { useEffect, useState } from "react";
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
    // Recharts 2.x reads an internal ThemeContext that is undefined during SSR
    // and on the very first React 19 render pass. Gate all chart rendering behind
    // a mounted flag so Recharts only runs after the client is fully hydrated.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-[280px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                    />
                ))}
            </div>
        );
    }

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
        { name: "Protocols", count: stats.totalProjects },
        { name: "Discussions", count: stats.totalTopics },
        { name: "Reports", count: stats.pendingReports },
    ];

    return (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* User Distribution Pie */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl py-0 gap-0 overflow-hidden">
                <CardHeader className="pb-2 pt-4 sm:pt-5">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        User Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 sm:pb-5">
                    {userPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
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
                        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                            No user data
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Protocol Status Pie */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl py-0 gap-0 overflow-hidden">
                <CardHeader className="pb-2 pt-4 sm:pt-5">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Protocol Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 sm:pb-5">
                    {projectPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
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
                        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                            No protocol data
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Content Overview Bar Chart */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl md:col-span-2 lg:col-span-1 py-0 gap-0 overflow-hidden">
                <CardHeader className="pb-2 pt-4 sm:pt-5">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Content Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 sm:pb-5">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={contentBarData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
