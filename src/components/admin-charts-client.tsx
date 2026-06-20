"use client";

import dynamic from "next/dynamic";

const AdminCharts = dynamic(() => import("@/components/admin-charts"), {
    ssr: false,
    loading: () => (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="h-[280px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                />
            ))}
        </div>
    ),
});

export type { } from "@/components/admin-charts";
export default AdminCharts;
