"use client";

import Link from "next/link";

function SidebarFooterLink({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  if (!href) {
    return (
      <span className={className} role="link" aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function DotSeparator() {
  return (
    <span className="text-zinc-400 dark:text-zinc-500 select-none" aria-hidden="true">
      ·
    </span>
  );
}

export default function SidebarFooter() {
  const currentYear = new Date().getFullYear();

  const handleOpenHelpCenter = () => {
    window.dispatchEvent(new CustomEvent("open-chatbox"));
  };

  return (
    <nav
      aria-label="Footer navigation"
      className="mt-4 px-1 text-xs leading-relaxed"
    >
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <SidebarFooterLink href="/pages/about">About</SidebarFooterLink>
        <DotSeparator />
        <SidebarFooterLink href="/pages/accessibility">Accessibility</SidebarFooterLink>
        <DotSeparator />
        <SidebarFooterLink onClick={handleOpenHelpCenter}>Help Center</SidebarFooterLink>
      </div>

      {/* Row 2 */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
        <SidebarFooterLink href="/pages/privacy-terms">Privacy &amp; Terms</SidebarFooterLink>
      </div>

      {/* Branding */}
      <p className="mt-3 text-zinc-400 dark:text-zinc-500">
        CNERSH © {currentYear}
      </p>
    </nav>
  );
}
