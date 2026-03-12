"use client";

import { TrendingUp, Newspaper, Hash, SearchIcon, PenLineIcon, MessageCircleIcon, HeartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProjectTracker from "@/components/project-tracker";

interface TrendingTag {
  tag: string;
  posts: number;
}

interface UserActivityItem {
  type: "post" | "comment" | "reaction";
  id: string;
  description: string;
  createdAt: Date;
}

interface FeedRightSidebarProps {
  trendingTags?: TrendingTag[];
  userActivity?: UserActivityItem[];
  isLoggedIn?: boolean;
}

function formatActivityDate(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const activityIcons = {
  post: PenLineIcon,
  comment: MessageCircleIcon,
  reaction: HeartIcon,
};

const activityColors = {
  post: "text-blue-500 bg-blue-50 dark:bg-blue-950",
  comment: "text-green-500 bg-green-50 dark:bg-green-950",
  reaction: "text-red-500 bg-red-50 dark:bg-red-950",
};

export default function FeedRightSidebar({ trendingTags = [], userActivity = [], isLoggedIn = false }: FeedRightSidebarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Protocol Tracker Card */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-blue-600" />
            Track Your Protocol
          </CardTitle>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Enter your protocol tracking code to check the current status.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ProjectTracker />
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card
        className={cn(
          "overflow-hidden rounded-xl border-0 bg-white p-4 shadow-sm",
          "dark:bg-zinc-900 dark:shadow-zinc-800/20"
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Trending Topics
          </h3>
        </div>

        {trendingTags.length > 0 ? (
          <ul className="space-y-1">
            {trendingTags.map(({ tag, posts }) => (
              <li
                key={tag}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  "text-zinc-700 hover:bg-zinc-100",
                  "dark:text-zinc-300 dark:hover:bg-zinc-800",
                  "transition-colors"
                )}
              >
                <Hash className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{tag}</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {posts} {posts === 1 ? "post" : "posts"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No trending topics yet. Start adding tags to your posts!
          </p>
        )}
      </Card>

      {/* User Activity Card - shown when logged in */}
      {isLoggedIn && (
        <Card
          className={cn(
            "overflow-hidden rounded-xl border-0 bg-white p-4 shadow-sm",
            "dark:bg-zinc-900 dark:shadow-zinc-800/20"
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="size-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Your Activity
            </h3>
          </div>

          {userActivity.length > 0 ? (
            <ul className="space-y-2">
              {userActivity.slice(0, 8).map((activity) => {
                const Icon = activityIcons[activity.type];
                const colorClass = activityColors[activity.type];
                return (
                  <li key={activity.id} className="flex items-start gap-2">
                    <div className={cn("flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5", colorClass)}>
                      <Icon className="size-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                        {activity.description}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {formatActivityDate(activity.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No recent activity. Start posting, commenting, and reacting!
            </p>
          )}
        </Card>
      )}

      {/* Community Highlights - only shown for guests */}
      {!isLoggedIn && (
        <Card
          className={cn(
            "overflow-hidden rounded-xl border-0 bg-white p-4 shadow-sm",
            "dark:bg-zinc-900 dark:shadow-zinc-800/20"
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="size-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Stay Connected
            </h3>
          </div>

          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Engage with posts, share ideas, and connect with fellow community
            members.
          </p>
        </Card>
      )}
    </div>
  );
}
