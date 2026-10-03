"use client";

import React from "react";

/**
 * EmojiPicker — extracted from feed-client.tsx (Case 13).
 *
 * Renders the emoji grid used by the composer and the comment thread.
 * The list is small, but extracting it lets us load it on demand via
 * `next/dynamic` so the initial feed bundle does not carry it.
 */
const EMOJI_LIST = [
    "😀", "😂", "😍", "🤔", "👍", "👎", "🎉", "🔥",
    "❤️", "💯", "🙏", "👏", "🤝", "💪", "✅", "⭐",
    "🚀", "💡", "📌", "🎯", "👀", "✨", "⚡", "🌟",
    "😁", "😅", "🤣", "😊", "😎", "😢", "😭", "😡",
    "😱", "🥶", "🥵", "😴", "🤯", "🥳", "😇", "🤗",
    "👋", "👌", "✌️", "🤟", "🙌", "🤲", "🫶", "🙏",
    "💃", "🕺", "👨‍💻", "👩‍💻", "🧠", "🫡",
    "💖", "💘", "💔", "❣️", "💕", "💞", "💓",
    "📢", "📣", "📷", "🎥", "🎵", "🎶", "🛠️", "⚙️",
    "🔒", "🔑", "💻", "📱", "🖥️", "🧾", "📊", "📈",
    "🌍", "🌈", "☀️", "🌙", "⭐", "🌊", "🌴", "🍀",
    "🌸", "🌺", "🌻",
    "🍕", "🍔", "🍟", "🍿", "🍩", "🍎", "🍉", "🍻",
    "☕", "🍷",
    "❗", "❓", "⭕", "❌", "✔️", "➕", "➖", "➰",
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    columns?: number;
}

export default function EmojiPicker({ onSelect, columns = 8 }: EmojiPickerProps) {
    return (
        <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {EMOJI_LIST.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 cursor-pointer"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}