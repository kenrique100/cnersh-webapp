"use client";

import React from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionIcon, REACTION_COLORS, REACTION_ORDER, type ReactionType, isReactionType } from "@/components/reaction-icons";

export const REACTIONS: { label: ReactionType; color: string }[] = REACTION_ORDER.map((label) => ({ label, color: REACTION_COLORS[label] }));

/** Get uppercase initials from a name, e.g. "John Doe" → "JD" */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const initials = name.split(/\s+/).filter(Boolean).map((n) => n[0]).join("").toUpperCase();
  return initials.slice(0, 2) || "U";
}

/** Relative time label – "Just now", "5m ago", "3h ago", etc. */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return postDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: postDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

export function formatFullDate(date: Date): string {
  const postDate = new Date(date);
  return postDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function postHasMedia(post: { image?: string | null; images?: string[]; video?: string | null; videos?: string[] }): boolean {
  return !!(post.image || (post.images && post.images.length > 0) || post.video || (post.videos && post.videos.length > 0));
}

export function renderPostContent(content: string): React.ReactNode[] {
  const parts = content.split(/(https?:\/\/[^\s]+|@[\w.-]+|#[\w.-]+)/g);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) return <a key={idx} href={part} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{part}</a>;
    if (part.startsWith("@") && part.length > 1) return <span key={idx} className="text-blue-600 font-medium">{part}</span>;
    if (part.startsWith("#") && part.length > 1) return <span key={idx} className="text-blue-600 font-medium">{part}</span>;
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface PostCardProps { children: React.ReactNode; }
export function PostCard({ children }: PostCardProps) { return <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl shadow-sm hover:shadow-md transition-shadow">{children}</Card>; }

/* ---------------------------------------------------------------------- */
/* PostContextBar — shown above a PostCard when there is recent activity  */
/* (other users currently viewing / reacting / commenting on the post).   */
/* This was previously imported by feed-client.tsx but never defined,     */
/* which caused the "Export PostContextBar doesn't exist" build error.    */
/* ---------------------------------------------------------------------- */
interface PostContextBarUser { id: string; name: string | null; image: string | null; }
interface PostContextBarProps { users: PostContextBarUser[]; likeCount: number; commentCount: number; }
export function PostContextBar({ users, likeCount, commentCount }: PostContextBarProps) {
  if (!users || users.length === 0) return null;
  const names = users.slice(0, 2).map((u) => u.name || "Someone");
  const label = names.length === 1
      ? `${names[0]} is active on this post`
      : `${names.join(" and ")} are active on this post`;
  return (
      <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5">
        <div className="flex items-center -space-x-2">
          {users.slice(0, 3).map((u) => (
              <Avatar key={u.id} className="h-5 w-5 border-2 border-white dark:border-gray-950">
                <AvatarImage src={u.image || undefined} alt={u.name || ""} />
                <AvatarFallback className="text-[9px] bg-gray-300 dark:bg-gray-700">{getInitials(u.name)}</AvatarFallback>
              </Avatar>
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {label}
          {(likeCount > 0 || commentCount > 0) &&
              ` · ${likeCount} reaction${likeCount !== 1 ? "s" : ""}, ${commentCount} comment${commentCount !== 1 ? "s" : ""}`}
      </span>
      </div>
  );
}

interface PostHeaderProps { userName: string | null; userImage: string | null; userProfession?: string | null; createdAt: Date; actions?: React.ReactNode; }
export function PostHeader({ userName, userImage, userProfession, createdAt, actions }: PostHeaderProps) { return <div className="px-3 sm:px-4 py-3 flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><Avatar className="h-11 w-11 border border-gray-200 dark:border-gray-700"><AvatarImage src={userImage || undefined} alt={userName || ""} /><AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">{getInitials(userName)}</AvatarFallback></Avatar><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{userName || "Anonymous"}</p></div><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfession || "Community Member"}</p><p className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeDate(createdAt)}</p></div></div>{actions}</div>; }

interface PostTextContentProps { content: string; customRender?: React.ReactNode; }
const SEE_MORE_THRESHOLD = 280;
export function PostTextContent({ content, customRender }: PostTextContentProps) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = content.length > SEE_MORE_THRESHOLD;
  if (customRender) return <div className="px-3 sm:px-4 py-3">{customRender}</div>;
  const truncatedLength = Math.max(SEE_MORE_THRESHOLD - 1, 0);
  const displayText = !expanded && isLong ? `${content.slice(0, truncatedLength)}…` : content;
  return <div className="px-3 sm:px-4 py-3"><p className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{renderPostContent(displayText)}</p>{isLong && <button onClick={() => setExpanded((prev) => !prev)} className="notranslate text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm mt-1" translate="no">{expanded ? "See less" : "See more"}</button>}</div>;
}

interface PostTagsProps { tags?: string[]; }
export function PostTags({ tags }: PostTagsProps) { if (!tags || tags.length === 0) return null; return <div className="px-3 sm:px-4 pb-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium">#{tag}</span>)}</div>; }

interface PostMediaContentProps { image?: string | null; images?: string[]; video?: string | null; videos?: string[]; onImageClick?: (index: number) => void; }
export function PostMediaContent({ image, images, video, videos, onImageClick }: PostMediaContentProps) {
  const allImages = [...(image ? [image] : []), ...(images || [])];
  const allVideos = [...(video ? [video] : []), ...(videos || [])];
  return <>{allImages.length > 0 && <div className="border-t border-b border-gray-100 dark:border-gray-800">{allImages.length === 1 ? <button type="button" className="w-full cursor-pointer focus:outline-none" onClick={() => onImageClick?.(0)}><Image src={allImages[0]} alt="Post attachment" width={700} height={400} className="w-full object-contain max-h-[500px] bg-gray-50 dark:bg-gray-900" unoptimized /></button> : <div className="grid gap-1 grid-cols-1 sm:grid-cols-2">{allImages.map((img, idx) => <button key={idx} type="button" className="cursor-pointer focus:outline-none" onClick={() => onImageClick?.(idx)}><Image src={img} alt={`Post attachment ${idx + 1}`} width={350} height={250} className={`w-full object-contain max-h-[250px] bg-gray-50 dark:bg-gray-900 ${idx === 0 && allImages.length === 3 ? "col-span-2" : ""}`} unoptimized /></button>)}</div>}</div>}{allVideos.length > 0 && <div className="border-t border-b border-gray-100 dark:border-gray-800 space-y-1">{allVideos.map((vid, idx) => <video key={idx} src={vid} controls className="w-full max-h-[500px] object-contain bg-black" />)}</div>}</>;
}

export function getReactionColor(label: string): string { return isReactionType(label) ? REACTION_COLORS[label] : REACTION_COLORS.Like; }
export function getReactionEmoji(label: string): React.JSX.Element { return isReactionType(label) ? <ReactionIcon type={label} size={14} /> : <span className="text-sm">👍</span>; }
export function getReactionBg(_label?: string): string { return ""; }

interface ReactionUser { userId: string; reactionType: string; userName?: string | null; }
interface PostEngagementSummaryProps { likeCount: number; commentCount: number; shareCount?: number; reactionTypes?: string[]; reactionUsers?: ReactionUser[]; onLikeCountClick?: () => void; onCommentCountClick?: () => void; }
export function PostEngagementSummary({ likeCount, commentCount, shareCount = 0, reactionTypes, reactionUsers, onLikeCountClick, onCommentCountClick }: PostEngagementSummaryProps) {
  if (likeCount === 0 && commentCount === 0 && shareCount === 0) return null;
  const topReactions: string[] = [];
  if (reactionTypes?.length) {
    const counts = new Map<string, number>();
    for (const rt of reactionTypes) counts.set(rt, (counts.get(rt) || 0) + 1);
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [label] of sorted.slice(0, 3)) topReactions.push(label);
  }
  const firstReactor = reactionUsers?.find((u) => u.userName)?.userName;
  const othersCount = likeCount - 1;
  let reactionLabel: React.ReactNode = <span>{likeCount}</span>;
  if (firstReactor && likeCount > 0) reactionLabel = likeCount === 1 ? <span className="truncate max-w-[160px]">{firstReactor}</span> : <span className="truncate max-w-[200px]">{firstReactor} and {othersCount} other{othersCount !== 1 ? "s" : ""}<span className="sr-only">{firstReactor}</span></span>;
  return <div className="px-2 sm:px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400"><div className="flex items-center gap-1.5 min-w-0">{likeCount > 0 && <button onClick={onLikeCountClick} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors min-w-0" type="button" aria-label={`${likeCount} ${likeCount === 1 ? "reaction" : "reactions"}`}><span className="flex items-center shrink-0">{(topReactions.length > 0 ? topReactions : ["Like"]).map((label, idx) => <span key={`${label}-${idx}`} className="inline-flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-950 shrink-0" style={{ width: 22, height: 22, backgroundColor: getReactionColor(label), marginLeft: idx > 0 ? -6 : 0, zIndex: 3 - idx, position: "relative" } as React.CSSProperties}><ReactionIcon type={(isReactionType(label) ? label : "Like") as ReactionType} size={12} /></span>)}</span><span className="text-sm font-medium">{firstReactor ? reactionLabel : likeCount}</span></button>}</div><div className="flex items-center gap-3 shrink-0">{commentCount > 0 && <button onClick={onCommentCountClick} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors" type="button">{commentCount} comment{commentCount !== 1 ? "s" : ""}</button>}{shareCount > 0 && <span className="flex items-center gap-1"><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>{shareCount} repost{shareCount !== 1 ? "s" : ""}</span>}</div></div>;
}
interface CommentReactionSummaryProps { reactionTypes: string[]; count: number; }
export function CommentReactionSummary({ reactionTypes, count }: CommentReactionSummaryProps) { if (count === 0) return null; const counts = new Map<string, number>(); for (const rt of reactionTypes) counts.set(rt, (counts.get(rt) || 0) + 1); const topReactions = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label); return <span className="inline-flex items-center gap-0.5 ml-1"><span className="flex items-center">{(topReactions.length > 0 ? topReactions : ["Like"]).map((label, idx) => <ReactionIcon key={`${label}-${idx}`} type={(isReactionType(label) ? label : "Like") as ReactionType} size={16} style={{ marginLeft: idx > 0 ? -3 : 0, zIndex: 3 - idx } as React.CSSProperties} />)}</span><span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">{count}</span></span>; }
interface PostActionBarProps { children: React.ReactNode; }
export function PostActionBar({ children }: PostActionBarProps) { return <div className="border-t border-gray-100 dark:border-gray-800 px-1 sm:px-2 py-1"><div className="flex items-center justify-between sm:justify-around">{children}</div></div>; }
interface PostCommentsSectionProps { children: React.ReactNode; }
export function PostCommentsSection({ children }: PostCommentsSectionProps) { return <div className="border-t border-gray-100 dark:border-gray-800 px-2 sm:px-4 py-3 space-y-3">{children}</div>; }