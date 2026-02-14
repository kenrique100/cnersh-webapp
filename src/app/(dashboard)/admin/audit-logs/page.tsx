import { authIsRequired } from "@/lib/auth-utils";
import { getAuditLogs } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollTextIcon } from "lucide-react";

export const dynamic = "force-dynamic";

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
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Audit Logs
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Track all administrative actions
                    </p>
                </div>

                {logs.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <ScrollTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No audit logs
                            </p>
                            <p className="text-sm text-gray-500">
                                Administrative actions will be logged here
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <Card
                                key={log.id}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                            >
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary">{log.action}</Badge>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {log.details || "No details"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">
                                                by {log.user.name || log.user.email}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
