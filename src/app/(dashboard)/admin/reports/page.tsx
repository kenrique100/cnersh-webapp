import { authIsRequired } from "@/lib/auth-utils";
import { getReports } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FlagIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const { reports } = await getReports();

    const statusColors: Record<string, string> = {
        PENDING: "bg-yellow-100 text-yellow-800",
        REVIEWED: "bg-green-100 text-green-800",
        DISMISSED: "bg-gray-100 text-gray-800",
    };

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Reports
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Review content reports from users
                    </p>
                </div>

                {reports.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FlagIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No reports
                            </p>
                            <p className="text-sm text-gray-500">
                                No content has been reported yet
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {reports.map((report) => (
                            <Card
                                key={report.id}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={report.user.image || undefined} />
                                                <AvatarFallback className="bg-blue-700 text-white text-xs">
                                                    {report.user.name?.charAt(0)?.toUpperCase() || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-sm">
                                                    Report by {report.user.name}
                                                </CardTitle>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant="secondary">{report.contentType}</Badge>
                                            <Badge className={statusColors[report.status] || ""}>
                                                {report.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {report.reason}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
