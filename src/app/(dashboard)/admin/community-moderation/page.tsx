import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CommunityModerationPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const topics = await db.communityTopic.findMany({
        where: { deleted: false },
        include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Community Moderation
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Review and moderate community discussions
                    </p>
                </div>

                {topics.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-500">No discussions to moderate</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {topics.map((topic) => (
                            <Card
                                key={topic.id}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={topic.user.image || undefined} />
                                            <AvatarFallback className="bg-blue-700 text-white text-xs">
                                                {topic.user.name?.charAt(0)?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-sm">{topic.title}</CardTitle>
                                            <p className="text-xs text-gray-500">
                                                by {topic.user.name} •{" "}
                                                {new Date(topic.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="ml-auto flex flex-wrap gap-1.5 shrink-0">
                                            <Badge variant="secondary">{topic.category}</Badge>
                                            <Badge variant="secondary">
                                                {topic._count.replies} replies
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                        {topic.content}
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
