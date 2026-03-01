"use client";

import Link from "next/link";
import { User, Rss, FolderOpen, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeedLeftSidebarProps {
  userName?: string | null;
  userImage?: string | null;
  isAdmin: boolean;
}

const navItems = [
  { href: "/update-profile", label: "My Profile", icon: User },
  { href: "/feeds", label: "Feeds", icon: Rss },
  { href: "/projects", label: "My Projects", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/community", label: "Community", icon: Users },
];

export default function FeedLeftSidebar({
  userName,
  userImage,
  isAdmin,
}: FeedLeftSidebarProps) {
  const links = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border-0 bg-white shadow-sm",
        "dark:bg-zinc-900 dark:shadow-zinc-800/20"
      )}
    >
      {/* Cover banner */}
      <div className="h-[60px] bg-gradient-to-r from-blue-600 to-indigo-500" />

      {/* Avatar + Info */}
      <div className="flex flex-col items-center px-4 pb-4">
        <Avatar className="-mt-9 size-[72px] border-4 border-white dark:border-zinc-900">
          <AvatarImage src={userImage ?? undefined} alt={userName ?? "User"} />
          <AvatarFallback className="text-lg font-semibold">
            {userName?.charAt(0)?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>

        <h3 className="mt-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
          {userName ?? "User"}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isAdmin ? "Admin" : "Community Member"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="border-t border-zinc-100 px-2 py-2 dark:border-zinc-800">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
              "text-zinc-700 hover:bg-zinc-100",
              "dark:text-zinc-300 dark:hover:bg-zinc-800",
              "transition-colors"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </Card>
  );
}
