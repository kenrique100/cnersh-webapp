"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  SearchIcon,
  PenLineIcon,
  MessageCircleIcon,
  HeartIcon,
  FileTextIcon,
  ChevronDownIcon,
  Users,
  FolderIcon,
  DownloadIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProjectTracker from "@/components/project-tracker";
import SidebarFooter from "@/components/sidebar-footer";

interface UserActivityItem {
  type: "post" | "comment" | "reaction";
  id: string;
  description: string;
  createdAt: Date;
}

interface FeedRightSidebarProps {
  userActivity?: UserActivityItem[];
  isLoggedIn?: boolean;
}

interface OurPagesItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const ourPagesItems: OurPagesItem[] = [
  { href: "/pages/about", label: "About Us", icon: Users },
  { href: "/pages/contract-rex", label: "Contract Rex Org", icon: FolderIcon },
  { href: "/pages/article", label: "Article", icon: Users },
  { href: "/membership.pdf", label: "Community Members", icon: DownloadIcon, external: true },
];

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
  post: "text-blue-600 dark:text-blue-400",
  comment: "text-blue-600 dark:text-blue-400",
  reaction: "text-blue-600 dark:text-blue-400",
};

export default function FeedRightSidebar({
                                           userActivity = [],
                                           isLoggedIn = false,
                                         }: FeedRightSidebarProps) {
  const pathname = usePathname();
  const isOurPagesRoute = pathname.startsWith("/pages/");
  const [isOurPagesExpanded, setIsOurPagesExpanded] = React.useState(false);
  const isOurPagesOpen = isOurPagesRoute || isOurPagesExpanded;

  return (
      <div className="flex flex-col gap-4">
        {/* Our Pages Card — PUBLIC, rendered for everyone (guest + logged-in) */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-lg overflow-hidden">
          <button
              type="button"
              onClick={() => setIsOurPagesExpanded((prev) => !prev)}
              className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold",
                  "transition-colors",
                  isOurPagesOpen
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                      : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              )}
              aria-expanded={isOurPagesOpen}
          >
            <FileTextIcon className="size-4 shrink-0 text-blue-600" />
            <span className="flex-1 text-left">Our Pages</span>
            <ChevronDownIcon
                className={cn(
                    "size-4 shrink-0 transition-transform duration-300",
                    isOurPagesOpen && "rotate-180"
                )}
            />
          </button>
          <div
              className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isOurPagesOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
              )}
          >
            <div className="overflow-hidden">
              <div className="px-3 pb-3 pt-1 space-y-0.5">
                {ourPagesItems.map(({ href, label, icon: Icon, external }) => {
                  const isActive = !external && pathname === href;
                  const classes = cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  );

                  if (external) {
                    return (
                        <a
                            key={href}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={classes}
                        >
                          <Icon className="size-3.5 shrink-0" />
                          {label}
                        </a>
                    );
                  }

                  return (
                      <Link key={href} href={href} className={classes}>
                        <Icon className="size-3.5 shrink-0" />
                        {label}
                      </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Protocol Tracker Card */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-lg">
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

        {/* User Activity Card - shown when logged in */}
        {isLoggedIn && (
            <Card
                className={cn(
                    "overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 shadow-sm",
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
                            <div className={cn("flex items-center justify-center w-6 h-6 shrink-0 mt-0.5", colorClass)}>
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
                    "overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 shadow-sm",
                    "dark:bg-zinc-900 dark:shadow-zinc-800/20"
                )}
            >
              <div className="mb-3 flex items-center gap-2">
                <Newspaper className="size-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Public community updates
                </h3>
              </div>

              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Read public updates from the CNERSH community. Sign in to post,
                comment, or react.
              </p>
            </Card>
        )}

        {/* Sidebar Footer */}
        <SidebarFooter />
      </div>
  );
}