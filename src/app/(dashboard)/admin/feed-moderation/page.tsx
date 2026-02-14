import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function FeedModerationPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const posts = await db.post.findMany({
        where: { deleted: false },
        include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { comments: true, likes: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Feed Moderation
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Review and moderate community posts
                    </p>
                </div>

                {posts.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-500">No posts to moderate</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {posts.map((post) => (
                            <Card
                                key={post.id}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={post.user.image || undefined} />
                                            <AvatarFallback className="bg-blue-700 text-white text-xs">
                                                {post.user.name?.charAt(0)?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-sm">{post.user.name}</CardTitle>
                                            <p className="text-xs text-gray-500">
                                                {new Date(post.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="ml-auto flex gap-2">
                                            <Badge variant="secondary">
                                                {post._count.likes} likes
                                            </Badge>
                                            <Badge variant="secondary">
                                                {post._count.comments} comments
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                        {post.content}
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
