"use client";

import { TrendingUp, Newspaper, Hash, SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProjectTracker from "@/components/project-tracker";

interface TrendingTag {
  tag: string;
  posts: number;
}

interface FeedRightSidebarProps {
  trendingTags?: TrendingTag[];
}

export default function FeedRightSidebar({ trendingTags = [] }: FeedRightSidebarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Project Tracker Card */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-blue-600" />
            Track Your Project
          </CardTitle>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Enter your project tracking code to check the current status.
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

      {/* Community Highlights */}
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
    </div>
  );
}
