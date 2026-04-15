"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ThumbsUp, Search, X, Clock, Smile } from "lucide-react";

// ─── LinkedIn-style quick reactions ────────────────────────────────────────────
const QUICK_REACTIONS = [
    { label: "Like",       emoji: "👍", color: "#0A66C2" },
    { label: "Love",       emoji: "❤️", color: "#F5666C" },
    { label: "Funny",      emoji: "😂", color: "#7FD1F6" },
    { label: "Insightful", emoji: "😮", color: "#F5A623" },
    { label: "Support",    emoji: "🥹", color: "#9B6DD6" },
    { label: "Celebrate",  emoji: "🎉", color: "#57C27D" },
] as const;

type ReactionLabel = (typeof QUICK_REACTIONS)[number]["label"];

// ─── WhatsApp-style full emoji dataset (grouped by category) ───────────────────
const EMOJI_CATEGORIES = [
    {
        id: "smileys",
        label: "Smileys & People",
        icon: "😀",
        emojis: [
            "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","🫠","😉","😊","😇","🥰","😍",
            "🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🫶","🤭","🫢",
            "🫣","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😶‍🌫️","😏","😒","🙄","😬","😮‍💨",
            "🤥","🫨","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴",
            "😵","😵‍💫","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","☹️","😮","😯",
            "😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓",
            "😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻",
            "👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
            "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫷","🫸","👌","🤌","🤏","✌️","🤞",
            "🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛",
            "🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💅","🤳","💪","🦾","🦿","🦵","🦶","👂",
        ],
    },
    {
        id: "animals",
        label: "Animals & Nature",
        icon: "🐶",
        emojis: [
            "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
            "🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝",
            "🪱","🐛","🦋","🐌","🐞","🐜","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖",
            "🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆",
            "🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎",
            "🌵","🎄","🌲","🌳","🌴","🪵","🌱","🌿","☘️","🍀","🎋","🎍","🍃","🍂","🍁","🪺",
            "🌾","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒",
        ],
    },
    {
        id: "food",
        label: "Food & Drink",
        icon: "🍔",
        emojis: [
            "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
            "🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🧄","🧅","🥔","🍠","🫘","🌰","🥜",
            "🍞","🥐","🥖","🫓","🥨","🥯","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖",
            "🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥙","🧆","🥚","🍱","🍘","🍙","🍚","🍛","🍜",
            "🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🍦","🍧","🍨","🍩","🍪",
            "🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🧃","🥤",
            "🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥢",
        ],
    },
    {
        id: "travel",
        label: "Travel & Places",
        icon: "🚗",
        emojis: [
            "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵",
            "🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","⛽","🚧","⚓","🛟","⛵","🚤","🛥️","🛳️",
            "⛴️","🚢","✈️","🛩️","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸","🪐",
            "🌍","🌎","🌏","🗺️","🗾","🧭","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️","🏟️",
            "🏛️","🏗️","🧱","🪨","🪵","🛖","🏘️","🏚️","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨",
            "🌅","🌄","🌠","🎇","🎆","🌇","🌆","🏙️","🌃","🌌","🌉","🌁","⛅","🌤️","🌥️","☁️",
        ],
    },
    {
        id: "activities",
        label: "Activities",
        icon: "⚽",
        emojis: [
            "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🥅","⛳",
            "🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂",
            "🏋️","🤼","🤸","⛹️","🤺","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇",
            "🥈","🥉","🏅","🎖️","🎗️","🏵️","🎫","🎟️","🎪","🤹","🎭","🩰","🎨","🖼️","🎰","🚂",
            "🎮","🕹️","🎲","♟️","🧩","🪅","🪆","🪄","🎭","🎬","🎤","🎧","🎼","🎵","🎶","🎷",
            "🪗","🎸","🎹","🎺","🎻","🥁","🪘","🎙️","📻","📺","📷","📸","📹","🎥","📽️","🎞️",
        ],
    },
    {
        id: "objects",
        label: "Objects",
        icon: "💡",
        emojis: [
            "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽","💾","💿","📀","🧮","📞","☎️",
            "📟","📠","📺","📻","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🪫","🔌","💡",
            "🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜",
            "🧲","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","🪤","🧱","⛓️","🔗","🪝","🧰","🪣",
            "💊","💉","🩸","🩹","🩺","🩻","🩼","🩺","🚪","🛏️","🛋️","🪑","🚽","🪠","🚿","🛁",
            "📦","📫","📪","📬","📭","📮","🗳️","✏️","✒️","🖊️","🖋️","📝","📁","📂","🗂️","📅",
        ],
    },
    {
        id: "symbols",
        label: "Symbols",
        icon: "%🔣",
        icon2: "🔣",
        emojis: [
            "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗",
            "💖","💘","💝","💟","☮️","✝️","☪️","🕉️","✡️","🔯","🪯","☯️","☦️","🛐","⛎","♈",
            "♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️",
            "📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹",
            "✅","☑️","✔️","❌","❎","➕","➖","➗","✖️","🟰","♾️","💲","💱","‼️","⁉️","❓",
            "❔","❕","❗","〰️","🔅","🔆","🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎",
        ],
    },
    {
        id: "flags",
        label: "Flags",
        icon: "🚩",
        emojis: [
            "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
            "🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲",
            "🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽",
            "🇦🇿","🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭",
            "🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇶","🇧🇷",
            "🇨🇦","🇨🇲","🇨🇳","🇫🇷","🇩🇪","🇬🇭","🇮🇳","🇯🇵",
            "🇰🇪","🇬🇧","🇺🇸","🇳🇬","🇿🇦","🇧🇷","🇦🇺","🇨🇩",
        ],
    },
];

const RECENT_KEY = "cnersh_recent_emojis";
const MAX_RECENT = 24;

function getRecentEmojis(): string[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
        return [];
    }
}

function addRecentEmoji(emoji: string) {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// ─── Category icon tab component ───────────────────────────────────────────────
const CATEGORY_ICONS = [
    { id: "recent",     icon: <Clock className="w-4 h-4" /> },
    { id: "smileys",    icon: "😀" },
    { id: "animals",    icon: "🐶" },
    { id: "food",       icon: "🍔" },
    { id: "travel",     icon: "🚗" },
    { id: "activities", icon: "⚽" },
    { id: "objects",    icon: "💡" },
    { id: "symbols",    icon: "🔣" },
    { id: "flags",      icon: "🚩" },
];

interface FullEmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

function FullEmojiPicker({ onSelect, onClose }: FullEmojiPickerProps) {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("recent");
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRecentEmojis(getRecentEmojis());
        setTimeout(() => searchRef.current?.focus(), 50);
    }, []);

    const handleSelect = useCallback((emoji: string) => {
        addRecentEmoji(emoji);
        setRecentEmojis(getRecentEmojis());
        onSelect(emoji);
    }, [onSelect]);

    const filteredResults = useMemo(() => {
        if (!search.trim()) return null;
        const q = search.toLowerCase();
        return EMOJI_CATEGORIES.flatMap((cat) =>
            cat.emojis.filter((e) => {
                // simple match: check if emoji itself matches or try codepoint name
                return e.includes(q);
            })
        );
    }, [search]);

    const displayCategories = useMemo(() => {
        if (activeCategory === "recent") {
            return [{ id: "recent", label: "Recently Used", icon: "🕐", emojis: recentEmojis }];
        }
        return EMOJI_CATEGORIES.filter((c) => c.id === activeCategory);
    }, [activeCategory, recentEmojis]);

    return (
        <div
            className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: 320, maxHeight: 420 }}
        >
            {/* ── Header: search bar ── */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5">
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search emoji"
                        className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none min-w-0"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* ── Category tabs ── */}
            {!search && (
                <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-2 overflow-x-auto scrollbar-none">
                    {CATEGORY_ICONS.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.id); scrollRef.current?.scrollTo(0, 0); }}
                            className={`flex-shrink-0 flex items-center justify-center w-8 h-8 text-base transition-all rounded-t-md ${
                                activeCategory === cat.id
                                    ? "border-b-2 border-green-500 text-green-600 dark:text-green-400"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}
                            title={cat.id}
                        >
                            {typeof cat.icon === "string" ? cat.icon : cat.icon}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Emoji grid ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
                {search ? (
                    filteredResults && filteredResults.length > 0 ? (
                        <div className="grid grid-cols-8 gap-0.5">
                            {filteredResults.map((emoji, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(emoji)}
                                    className="flex items-center justify-center w-9 h-9 text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title={emoji}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-xs text-gray-400 py-8">No emoji found</p>
                    )
                ) : (
                    displayCategories.map((cat) => (
                        <div key={cat.id}>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                                {cat.label}
                            </p>
                            {cat.emojis.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">No recent emoji</p>
                            ) : (
                                <div className="grid grid-cols-8 gap-0.5 mb-3">
                                    {cat.emojis.map((emoji, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(emoji)}
                                            className="flex items-center justify-center w-9 h-9 text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title={emoji}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Main ReactionsPicker ───────────────────────────────────────────────────────
interface ReactionsPickerProps {
    postId: string;
    initialReaction?: string | null;
    initialCount?: number;
    onReact?: (postId: string, reactionType: string) => void;
    /** If true, also renders the full emoji picker trigger (💬 comment emoji button) */
    showEmojiPicker?: boolean;
    onEmojiSelect?: (emoji: string) => void;
}

export function ReactionsPicker({
    postId,
    initialReaction,
    initialCount = 0,
    onReact,
    showEmojiPicker = false,
    onEmojiSelect,
}: ReactionsPickerProps) {
    const [selectedReaction, setSelectedReaction] = useState<ReactionLabel | null>(
        (initialReaction as ReactionLabel) || null
    );
    const [count, setCount] = useState(initialCount);
    const [showQuickPicker, setShowQuickPicker] = useState(false);
    const [showFullPicker, setShowFullPicker] = useState(false);

    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fullPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setSelectedReaction((initialReaction as ReactionLabel) || null); }, [initialReaction]);
    useEffect(() => { setCount(initialCount); }, [initialCount]);

    // Close pickers on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowQuickPicker(false);
            }
            if (fullPickerRef.current && !fullPickerRef.current.contains(e.target as Node)) {
                setShowFullPicker(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const handleMouseEnter = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setShowQuickPicker(true), 400);
    };
    const handleMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        leaveTimerRef.current = setTimeout(() => setShowQuickPicker(false), 300);
    };
    const handlePickerMouseEnter = () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); };
    const handlePickerMouseLeave = () => { leaveTimerRef.current = setTimeout(() => setShowQuickPicker(false), 300); };

    const handleEmojiClick = (label: ReactionLabel) => {
        setShowQuickPicker(false);
        const isSame = selectedReaction === label;
        if (isSame) {
            setSelectedReaction(null);
            setCount((c) => Math.max(0, c - 1));
        } else {
            if (!selectedReaction) setCount((c) => c + 1);
            setSelectedReaction(label);
        }
        onReact?.(postId, label);
    };

    const handleMainButtonClick = () => {
        if (showQuickPicker) return;
        const reactionType: ReactionLabel = (selectedReaction as ReactionLabel) || "Like";
        if (selectedReaction) {
            setSelectedReaction(null);
            setCount((c) => Math.max(0, c - 1));
        } else {
            setSelectedReaction("Like");
            setCount((c) => c + 1);
        }
        onReact?.(postId, reactionType);
    };

    const activeReaction = QUICK_REACTIONS.find((r) => r.label === selectedReaction);
    const isActive = !!selectedReaction;

    return (
        <div className="flex items-center gap-1">
            {/* ── LinkedIn-style quick reaction button + hover pill ── */}
            <div ref={containerRef} className="relative">
                {/* Quick reactions hover pill — LinkedIn style */}
                {showQuickPicker && (
                    <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.18)", minWidth: "max-content" }}
                        onMouseEnter={handlePickerMouseEnter}
                        onMouseLeave={handlePickerMouseLeave}
                    >
                        {QUICK_REACTIONS.map((r) => (
                            <button
                                key={r.label}
                                type="button"
                                onClick={() => handleEmojiClick(r.label)}
                                className="group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 hover:scale-150 hover:-translate-y-2 cursor-pointer"
                                title={r.label}
                            >
                                <span className="text-2xl drop-shadow select-none">{r.emoji}</span>
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-semibold">
                                    {r.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Like / reaction button */}
                <button
                    type="button"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleMainButtonClick}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        isActive
                            ? "hover:bg-blue-50 dark:hover:bg-blue-950"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    style={isActive && activeReaction ? { color: activeReaction.color } : undefined}
                >
                    {isActive && activeReaction ? (
                        <span className="text-base leading-none select-none">{activeReaction.emoji}</span>
                    ) : (
                        <ThumbsUp className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                        {isActive && activeReaction ? activeReaction.label : "Like"}
                    </span>
                    {count > 0 && <span className="ml-0.5 tabular-nums">{count}</span>}
                </button>
            </div>

            {/* ── Full emoji picker trigger (optional, for comment boxes) ── */}
            {showEmojiPicker && (
                <div ref={fullPickerRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setShowFullPicker((v) => !v)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Emoji picker"
                    >
                        <Smile className="w-4 h-4" />
                    </button>

                    {showFullPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <FullEmojiPicker
                                onSelect={(emoji) => {
                                    onEmojiSelect?.(emoji);
                                    setShowFullPicker(false);
                                }}
                                onClose={() => setShowFullPicker(false)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Standalone FullEmojiPicker export (for comment inputs etc.) ────────────────
export { FullEmojiPicker };
