"use client";

import dynamic from "next/dynamic";

// Recharts 2.x accesses an internal ThemeContext that is undefined on the server
// and during the React 19 first-render pass. `ssr: false` must live in a Client
// Component — this thin wrapper satisfies that requirement so the Server
// Component (admin/page.tsx) can import it safely.
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
