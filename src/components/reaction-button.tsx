"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  ReactionIcon,
  REACTION_COLORS,
  REACTION_ORDER,
  type ReactionType,
  isReactionType,
} from "@/components/reaction-icons";

export interface ReactionButtonProps {
  reaction: {
    label: ReactionType;
    color?: string;
  };
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

export function ReactionButton({ reaction, onClick, isActive = false, className = "" }: ReactionButtonProps) {
  const [isClicked, setIsClicked] = React.useState(false);

  const handleClick = () => {
    setIsClicked(true);
    window.setTimeout(() => setIsClicked(false), 240);
    onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const color = reaction.color || REACTION_COLORS[reaction.label];

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
      aria-pressed={isActive}
      aria-label={reaction.label}
      className={cn(
        "group relative flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all duration-200",
        "hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400/60",
        isClicked && "animate-bounce-click",
        isActive && "bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-200 dark:ring-blue-800",
        className,
      )}
      style={{ animation: isClicked ? "popBounce 0.24s ease-out" : undefined }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full transition-transform duration-200",
          "group-hover:scale-110 group-hover:drop-shadow-lg",
          isActive && "ring-2 ring-white dark:ring-gray-950",
        )}
        style={{ backgroundColor: color, width: 42, height: 42 }}
      >
        <ReactionIcon type={reaction.label} size={24} />
      </div>
      <span className={cn("text-xs font-medium transition-opacity text-gray-700 dark:text-gray-300", "opacity-0 group-hover:opacity-100")}>{reaction.label}</span>
    </button>
  );
}

export interface ReactionPickerProps {
  reactions?: readonly { label: ReactionType; color?: string }[];
  onReaction: (label: ReactionType | null) => void;
  userReaction?: ReactionType | null;
  className?: string;
}

export function ReactionPicker({ reactions = REACTION_ORDER.map((label) => ({ label })), onReaction, userReaction, className = "" }: ReactionPickerProps) {
  const handleReaction = (label: ReactionType) => {
    onReaction(userReaction === label ? null : label);
  };

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700", className)}>
      {reactions.map((reaction) => (
        <ReactionButton
          key={reaction.label}
          reaction={reaction}
          onClick={() => handleReaction(reaction.label)}
          isActive={userReaction === reaction.label}
        />
      ))}
    </div>
  );
}

if (typeof document !== "undefined") {
  const styleId = "reaction-animations";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes popBounce {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      .animate-bounce-click { animation: popBounce 0.24s ease-out; }
    `;
    document.head.appendChild(style);
  }
}

export { isReactionType };
