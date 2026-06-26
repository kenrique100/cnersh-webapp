"use client";

import React from "react";
import { Newspaper, MoreHorizontal, SearchIcon, PenLineIcon, MessageCircleIcon, HeartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProjectTracker from "@/components/project-tracker";
import SidebarFooter from "@/components/sidebar-footer";

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

function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const val = (n / 1_000_000).toFixed(1);
    return val.endsWith(".0") ? val.slice(0, -2) + "M" : val + "M";
  }
  if (n >= 1_000) {
    const val = (n / 1_000).toFixed(1);
    return val.endsWith(".0") ? val.slice(0, -2) + "K" : val + "K";
  }
  return n.toString();
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
  const [displayTags, setDisplayTags] = React.useState<TrendingTag[]>(trendingTags);
  // Start in loading state only when the server provided no tags, so we show a
  // skeleton while the client-side fetch runs instead of flashing the empty state.
  const [tagsLoading, setTagsLoading] = React.useState(trendingTags.length === 0);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    // If the server already provided tags, use them directly
    if (trendingTags.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayTags(trendingTags);
      setTagsLoading(false);
      return;
    }

    // Fallback: fetch client-side in case server-side data was empty
    let cancelled = false;
    fetch("/api/trending-tags?limit=8")
        .then((res) => {
          if (!res.ok) throw new Error("Non-OK response");
          return res.json() as Promise<TrendingTag[]>;
        })
        .then((data) => {
          if (!cancelled) setDisplayTags(data);
        })
        .catch(() => {
          // silently ignore — we'll show the empty state
        })
        .finally(() => {
          if (!cancelled) setTagsLoading(false);
        });

    return () => {
      cancelled = true;
    };
  }, [trendingTags]);

  const visibleTags = showAll ? displayTags : displayTags.slice(0, 5);

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

      {/* Trending Topics — X/Twitter style */}
      <div className="rounded-2xl overflow-hidden bg-[#F7F9F9] dark:bg-[#16181C]">
        <h2 className="px-4 pt-3 pb-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
          Trends for you
        </h2>

        {tagsLoading ? (
          <div className="px-4 py-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-3.5 w-28 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-2.5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : visibleTags.length > 0 ? (
          <>
            {visibleTags.map(({ tag, posts }) => (
              <div
                key={tag}
                className="group flex items-start justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    Trending
                  </p>
                  <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    #{tag}
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {formatCount(posts)} {posts === 1 ? "post" : "posts"}
                  </p>
                </div>
                <button
                  className={cn(
                    "ml-3 mt-0.5 flex-shrink-0 rounded-full p-1.5 transition-colors",
                    "text-zinc-400 dark:text-zinc-500",
                    "opacity-0 group-hover:opacity-100",
                    "hover:text-blue-500 dark:hover:text-blue-400",
                    "hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  )}
                  aria-label={`More options for #${tag}`}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            ))}

            {displayTags.length > 5 && (
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="w-full px-4 py-3 text-left text-[15px] text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-zinc-100 dark:border-zinc-800"
              >
                {showAll ? "Show less" : "Show more"}
              </button>
            )}
          </>
        ) : (
          <div className="px-4 py-3 pb-4">
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
              No trending topics yet. Start adding tags to your posts!
            </p>
          </div>
        )}
      </div>

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

      {/* Sidebar Footer */}
      <SidebarFooter />
    </div>
  );
}
