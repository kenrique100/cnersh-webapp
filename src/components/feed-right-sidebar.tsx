"use client";

import { TrendingUp, Newspaper, Hash } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const trendingTopics = [
  { tag: "Technology", posts: "1,245 posts" },
  { tag: "Community", posts: "982 posts" },
  { tag: "Education", posts: "874 posts" },
  { tag: "Research", posts: "651 posts" },
  { tag: "Innovation", posts: "543 posts" },
];

export default function FeedRightSidebar() {
  return (
    <div className="flex flex-col gap-4">
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

        <ul className="space-y-1">
          {trendingTopics.map(({ tag, posts }) => (
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
                  {posts}
                </p>
              </div>
            </li>
          ))}
        </ul>
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
