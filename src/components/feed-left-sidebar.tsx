"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User, Rss, FolderOpen, Settings, Users, ShieldCheckIcon, UsersIcon, FolderIcon, FileTextIcon, ChevronDownIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/user-avatar";

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
  { href: "/protocols", label: "My Protocols", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/community", label: "Community", icon: Users },
];

const ourPagesItems = [
  { href: "/pages/about", label: "About Us", icon: Users },
  { href: "/pages/contract-rex", label: "Contract Rex Org", icon: FolderIcon },
  { href: "/membership.pdf", label: "Membership", icon: DownloadIcon, external: true },
  { href: "/Fiche d'Evaluation CNERSH.pdf", label: "Evaluation Form", icon: DownloadIcon, external: true },
] as const;

const communityFooterLinks: { label: string; href: string }[] = [
  { label: "About", href: "/pages/about" },
  { label: "Accessibility", href: "/pages/accessibility" },
  { label: "Privacy & Terms", href: "/pages/privacy-terms" },
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
  const pathname = usePathname();
  const isOurPagesRoute = pathname.startsWith("/pages/");
  const [isOurPagesExpanded, setIsOurPagesExpanded] = React.useState(isOurPagesRoute);
  const isOurPagesOpen = isOurPagesRoute || isOurPagesExpanded;

  if (isGuest) {
    return (
      <div className="space-y-4">
        {/* Guest Welcome Card */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-lg overflow-hidden">
          <div className="bg-blue-800 p-4 pb-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-md bg-white">
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
                  Create account
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
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-lg">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Secure Access</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Role-based access control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Community</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Collaborate nationwide</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FolderIcon className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Protocol Submissions</p>
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
        "overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm",
        "dark:bg-zinc-900 dark:shadow-zinc-800/20"
      )}
    >
      {/* Cover banner */}
      <div className="h-[60px] bg-blue-700" />

      {/* Avatar + Info */}
      <div className="flex flex-col items-center px-4 pb-4">
        <UserAvatar
          name={userName}
          image={userImage}
          gender={userGender}
          className="-mt-9 size-[72px] border-4 border-white dark:border-zinc-900"
          iconClassName="h-6 w-6"
        />

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
        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
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
              "transition-colors",
              pathname === href
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
        <div>
          <button
            type="button"
            onClick={() => {
              setIsOurPagesExpanded((prev) => !prev);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
              "transition-colors",
              isOurPagesRoute || isOurPagesOpen
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            <FileTextIcon className="size-4 shrink-0" />
            <span className="flex-1">Our Pages</span>
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
              isOurPagesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="ml-7 mt-1 space-y-1 border-l border-zinc-200 pl-2.5 dark:border-zinc-700">
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
        </div>
      </nav>

      {/* Community Footer Links */}
      {isAdmin && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {communityFooterLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] text-zinc-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400 hover:underline transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-2">CNERSH © {new Date().getFullYear()}</p>
        </div>
      )}
    </Card>
  );
}
