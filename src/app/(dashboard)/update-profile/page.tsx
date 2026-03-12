import { updateProfile, getUserActivity } from "@/app/actions/user";
import { authIsRequired } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PenSquareIcon, FolderIcon, MessageSquareIcon, HeartIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 0) return "just now";
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

export default async function ProfilePage() {
    await authIsRequired();
    const user = await updateProfile();

    if (!user) redirect("/sign-in");

    const { posts, projects, totalPosts, totalProjects } = await getUserActivity();

    const userInitials = user.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : user.email.slice(0, 2).toUpperCase();

    // Merge posts and projects into a single timeline sorted by date
    type TimelineItem =
        | { type: "post"; date: Date; data: (typeof posts)[0] }
        | { type: "project"; date: Date; data: (typeof projects)[0] };

    const timeline: TimelineItem[] = [
        ...posts.map((p) => ({ type: "post" as const, date: new Date(p.createdAt), data: p })),
        ...projects.map((p) => ({ type: "project" as const, date: new Date(p.createdAt), data: p })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header Card */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg mb-8 overflow-hidden">
                    <div className="h-28 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
                    <CardContent className="relative pt-0 pb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
                            <Avatar className="h-24 w-24 border-4 border-white dark:border-gray-950 shadow-lg">
                                <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                <AvatarFallback className="bg-blue-700 text-white text-2xl font-bold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 pt-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {user.name || "User"}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                            <Link
                                href="/settings"
                                className="text-sm text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                            >
                                Edit Profile
                            </Link>
                        </div>
                        {/* Stats Bar */}
                        <div className="flex gap-6 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalPosts}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Posts</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalProjects}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Protocols</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Timeline */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Activity</h2>
                </div>

                {timeline.length === 0 ? (
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                        <CardContent className="py-12 text-center">
                            <PenSquareIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                No activity yet
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Your posts and protocols will appear here
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {timeline.map((item, index) => {
                            if (item.type === "post") {
                                const post = item.data;
                                return (
                                    <Card key={`post-${post.id}-${index}`} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 shrink-0 mt-0.5">
                                                    <PenSquareIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Post</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(post.createdAt)}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
                                                        {post.content}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <HeartIcon className="w-3.5 h-3.5" />
                                                            {post._count.likes}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquareIcon className="w-3.5 h-3.5" />
                                                            {post._count.comments}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            } else {
                                const project = item.data;
                                return (
                                    <Card key={`project-${project.id}-${index}`} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex items-start gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 shrink-0 mt-0.5">
                                                    <FolderIcon className="w-4 h-4 text-green-700 dark:text-green-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Protocol</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(project.createdAt)}</span>
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                        {project.title}
                                                    </CardTitle>
                                                </div>
                                                <Badge className={statusColors[project.status] || ""}>
                                                    {project.status.replace("_", " ")}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-4 pl-[60px]">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                {project.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span>{project.category}</span>
                                                {project.location && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{project.location}</span>
                                                    </>
                                                )}
                                            </div>
                                            {project.feedback && (
                                                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-800 dark:text-yellow-200">
                                                    <strong>Feedback:</strong> {project.feedback}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            }
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}