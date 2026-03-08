"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Rss, FolderOpen, Settings, Users, ShieldCheckIcon, UsersIcon, FolderIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeedLeftSidebarProps {
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
  userGender?: string | null;
  userRole?: string | null;
  isAdmin: boolean;
  isGuest?: boolean;
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
  userEmail,
  userGender,
  userRole,
  isAdmin,
  isGuest = false,
}: FeedLeftSidebarProps) {
  if (isGuest) {
    return (
      <div className="space-y-4">
        {/* Guest Welcome Card */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 pb-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md">
                <Image
                  src="/logo.png"
                  alt="CNERSH Logo"
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-lg font-bold text-white">CNERSH</h1>
            <p className="text-xs text-blue-100 mt-0.5">National Ethics Committee for Health Research on Humans</p>
          </div>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Reviews research proposals involving human participants to ensure they are ethically sound and compliant with relevant guidelines and regulations, protecting the rights, safety, and well-being of participants.
            </p>
            <div className="flex flex-col gap-2 mt-3">
              <Link href="/sign-up">
                <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs">
                  Get Started
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
                <ShieldCheckIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Secure Access</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Role-based access control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
                <UsersIcon className="w-4 h-4 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Community</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Collaborate nationwide</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 shrink-0">
                <FolderIcon className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Project Submissions</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Submit for ethical review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        {userEmail && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center truncate max-w-full">
            {userEmail}
          </p>
        )}
        {userGender && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize mt-0.5">
            {userGender}
          </p>
        )}
        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
          {userRole || (isAdmin ? "Admin" : "Community Member")}
        </span>
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
