import { authIsRequired } from "@/lib/auth-utils";
import { getAuditLogs } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollTextIcon, ClockIcon, UserIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    BAN: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    APPROVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    REJECT: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    WARNING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
};

function getActionColor(action: string): string {
    const key = Object.keys(actionColors).find((k) =>
        action.toUpperCase().includes(k)
    );
    return key ? actionColors[key] : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

export default async function AuditLogsPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const { logs } = await getAuditLogs();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                            <ScrollTextIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Audit Logs
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Track all administrative actions on the platform
                            </p>
                        </div>
                    </div>
                </div>

                {logs.length === 0 ? (
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardContent className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <ScrollTextIcon className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    No audit logs yet
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Administrative actions will be logged here
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                        {/* Table Header */}
                        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <div className="col-span-3">Action</div>
                            <div className="col-span-4">Details</div>
                            <div className="col-span-3">Performed By</div>
                            <div className="col-span-2">Date</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {logs.map((log: { id: string; action: string; details: string | null; createdAt: Date; user: { name: string | null; email: string } }) => (
                                <div
                                    key={log.id}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-6 py-4 items-start sm:items-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                >
                                    <div className="sm:col-span-3 min-w-0">
                                        <p className="sm:hidden text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                            Action
                                        </p>
                                        <Badge className={`${getActionColor(log.action)} font-medium text-xs max-w-full whitespace-normal break-all h-auto py-1 text-left`}>
                                            {log.action}
                                        </Badge>
                                    </div>
                                    <div className="sm:col-span-4 min-w-0">
                                        <p className="sm:hidden text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                            Details
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words line-clamp-3 sm:line-clamp-2">
                                            {log.details || "No details provided"}
                                        </p>
                                    </div>
                                    <div className="sm:col-span-3 min-w-0">
                                        <p className="sm:hidden text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                            Performed By
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <UserIcon className="h-3.5 w-3.5 text-gray-500" />
                                            </div>
                                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {log.user.name || log.user.email}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <p className="sm:hidden text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                            Date
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <ClockIcon className="h-3.5 w-3.5" />
                                            <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
