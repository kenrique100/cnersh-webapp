"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ThumbsUp, Search, X, Clock } from "lucide-react";

// ─── LinkedIn-style quick reactions (WhatsApp-inspired expressive set) ──────────
const QUICK_REACTIONS = [
    { label: "Like",       emoji: "👍",  color: "#0A66C2" },
    { label: "Love",       emoji: "❤️",  color: "#F5666C" },
    { label: "Haha",       emoji: "😂",  color: "#F7C948" },
    { label: "Wow",        emoji: "😮",  color: "#F5A623" },
    { label: "Sad",        emoji: "😢",  color: "#9B6DD6" },
    { label: "Angry",      emoji: "😡",  color: "#E5534B" },
] as const;

type ReactionLabel = (typeof QUICK_REACTIONS)[number]["label"];

// ─── Full emoji dataset — all categories (WhatsApp grouping order) ──────────────
const EMOJI_CATEGORIES = [
    {
        id: "smileys",
        label: "Smileys & People",
        icon: "😀",
        emojis: [
            // Smileys
            "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","🫠","😉","😊","😇",
            "🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑",
            "🤗","🤭","🫢","🫣","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏",
            "😒","🙄","😬","🤥","🫨","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢",
            "🤮","🤧","🥵","🥶","🥴","😵","😵‍💫","🤯","🤠","🥳","🥸","😎","🤓","🧐",
            "😕","🫤","😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨",
            "😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡",
            "😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖",
            // Cat faces
            "😺","😸","😹","😻","😼","😽","🙀","😿","😾",
            // Hands & gestures
            "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫷","🫸","👌","🤌","🤏",
            "✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵",
            "👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏",
            "💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷",
            "🦴","👀","👁️","👅","👄","🫦","👶","🧒","👦","👧","🧑","👱","👨","🧔",
            "👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷",
        ],
    },
    {
        id: "animals",
        label: "Animals & Nature",
        icon: "🐶",
        emojis: [
            // Animals
            "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷",
            "🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺",
            "🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪲","🪳","🦟","🦗",
            "🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠",
            "🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛",
            "🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙",
            "🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜",
            "🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔",
            // Nature & plants
            "🌵","🎄","🌲","🌳","🌴","🪵","🌱","🌿","☘️","🍀","🎋","🎍","🍃","🍂",
            "🍁","🪺","🌾","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖",
            "🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌟","⭐","🌠","☀️","🌤️","⛅","🌥️",
            "☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","💨","💧","💦","🌊",
        ],
    },
    {
        id: "food",
        label: "Food & Drink",
        icon: "🍔",
        emojis: [
            // Fruits
            "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭",
            "🍍","🥥","🥝","🍅","🍆","🥑",
            // Vegetables
            "🥦","🥬","🥒","🌶️","🫑","🧄","🧅","🥔","🍠","🫘","🌰","🥜",
            // Bread & grains
            "🍞","🥐","🥖","🫓","🥨","🥯","🧀","🥚","🍳","🧈","🥞","🧇",
            // Meat
            "🥓","🥩","🍗","🍖",
            // Fast food
            "🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥙","🧆",
            // Asian food
            "🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡",
            // Sweets
            "🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯",
            // Drinks
            "🍼","🥛","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃",
            "🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥢",
        ],
    },
    {
        id: "travel",
        label: "Travel & Transport",
        icon: "🚗",
        emojis: [
            // Land transport
            "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜",
            "🏍️","🛵","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","⛽","🚧",
            // Water transport
            "⚓","🛟","⛵","🚤","🛥️","🛳️","⛴️","🚢",
            // Air transport
            "✈️","🛩️","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸",
            // Places & geography
            "🌍","🌎","🌏","🗺️","🗾","🧭","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️",
            "🏞️","🏟️","🏛️","🏗️","🏘️","🏚️","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨",
            "🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍",
            // Scenes
            "🌅","🌄","🌠","🎇","🎆","🌇","🌆","🏙️","🌃","🌌","🌉","🌁",
        ],
    },
    {
        id: "activities",
        label: "Activities & Sports",
        icon: "⚽",
        emojis: [
            // Ball sports
            "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱",
            // Racquet / table
            "🏓","🏸","🏒","🥅","⛳","🪁","🏹","🎣","🤿",
            // Combat
            "🥊","🥋",
            // Winter / board
            "🎿","⛷️","🏂","🪂","⛸️","🥌","🛷",
            // Athletics
            "🏋️","🤼","🤸","⛹️","🤺","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴",
            // Awards
            "🏆","🥇","🥈","🥉","🏅","🎖️","🎗️",
            // Entertainment
            "🎪","🤹","🎭","🩰","🎨","🖼️",
            // Games
            "🎮","🕹️","🎲","♟️","🧩","🪅","🪆","🪄",
            // Music
            "🎤","🎧","🎼","🎵","🎶","🎷","🪗","🎸","🎹","🎺","🎻","🥁","🪘",
            // Media
            "🎙️","📻","📺","📷","📸","📹","🎥","📽️","🎞️","🎬",
        ],
    },
    {
        id: "objects",
        label: "Objects & Tools",
        icon: "💡",
        emojis: [
            // Devices
            "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽","💾","💿","📀","🧮",
            "📞","☎️","📟","📠","📡","🔋","🪫","🔌","💡","🔦","🕯️",
            // Time
            "⏱️","⏲️","⏰","🕰️","⌛","⏳",
            // Money
            "💸","💵","💴","💶","💷","🪙","💰","💳","💎",
            // Tools
            "⚖️","🪜","🧲","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","🪤","🔗","🪝","🧰","🪣",
            // Medical
            "💊","💉","🩸","🩹","🩺","🩻","🩼",
            // Household
            "🚪","🛏️","🛋️","🪑","🚽","🪠","🚿","🛁","🧴","🧷","🧹","🧺","🧻","🪣","🧼",
            // Stationery
            "📦","📫","📪","📬","📭","📮","✏️","✒️","🖊️","🖋️","📝","📁","📂","📅","📆",
            "📇","📈","📉","📊","📋","📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️",
        ],
    },
    {
        id: "symbols",
        label: "Symbols & Signs",
        icon: "🔣",
        emojis: [
            // Hearts
            "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹",
            "💕","💞","💓","💗","💖","💘","💝","💟",
            // Religious / spiritual
            "☮️","✝️","☪️","🕉️","✡️","🔯","🪯","☯️","☦️","🛐",
            // Zodiac
            "⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓",
            // Info signs
            "🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚",
            "💮","🉐","㊙️","㊗️","🈴","🈵","🈹",
            // Math & punctuation
            "✅","☑️","✔️","❌","❎","➕","➖","➗","✖️","🟰","♾️","💲","💱",
            "‼️","⁉️","❓","❔","❕","❗","〰️",
            // Misc signs
            "🔅","🔆","🔱","⚜️","🔰","♻️","🈯","💹","❇️","✳️",
            "🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤",
            "🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘","🔲","🔳","⬛","⬜","▪️","▫️",
        ],
    },
    {
        id: "flags",
        label: "Flags",
        icon: "🚩",
        emojis: [
            "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
            "🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺",
            "🇦🇼","🇦🇿","🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇮","🇧🇯","🇧🇲","🇧🇳","🇧🇴","🇧🇷",
            "🇧🇸","🇧🇹","🇧🇼","🇧🇾","🇧🇿","🇨🇦","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇲","🇨🇳","🇨🇴",
            "🇨🇷","🇨🇺","🇨🇻","🇨🇾","🇨🇿","🇩🇪","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿","🇪🇨","🇪🇪","🇪🇬",
            "🇪🇷","🇪🇸","🇪🇹","🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷","🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇭",
            "🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇶","🇬🇷","🇬🇹","🇬🇼","🇬🇾","🇭🇰","🇭🇳","🇭🇷","🇭🇹","🇭🇺",
            "🇮🇩","🇮🇪","🇮🇱","🇮🇳","🇮🇶","🇮🇷","🇮🇸","🇮🇹","🇯🇲","🇯🇴","🇯🇵","🇰🇪","🇰🇬","🇰🇭",
            "🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇿","🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸",
            "🇱🇹","🇱🇺","🇱🇻","🇱🇾","🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳",
            "🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿","🇳🇦","🇳🇬",
            "🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇿","🇴🇲","🇵🇦","🇵🇪","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇸",
            "🇵🇹","🇵🇼","🇵🇾","🇶🇦","🇷🇴","🇷🇸","🇷🇺","🇷🇼","🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬",
            "🇸🇮","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇾","🇸🇿","🇹🇩","🇹🇬",
            "🇹🇭","🇹🇯","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇿","🇺🇦","🇺🇬","🇺🇸","🇺🇾",
            "🇺🇿","🇻🇦","🇻🇨","🇻🇪","🇻🇳","🇻🇺","🇼🇸","🇾🇪","🇿🇦","🇿🇲","🇿🇼",
        ],
    },
];

const RECENT_KEY = "cnersh_recent_emojis";
const MAX_RECENT = 32;

function getRecentEmojis(): string[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
}
function addRecentEmoji(emoji: string) {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// Category tab definitions (order matches EMOJI_CATEGORIES + recent)
const CATEGORY_TABS = [
    { id: "recent",     label: "Recent",                icon: <Clock className="w-4 h-4" /> },
    { id: "smileys",    label: "Smileys & People",       icon: "😀" },
    { id: "animals",    label: "Animals & Nature",       icon: "🐶" },
    { id: "food",       label: "Food & Drink",           icon: "🍔" },
    { id: "travel",     label: "Travel & Transport",     icon: "🚗" },
    { id: "activities", label: "Activities & Sports",    icon: "⚽" },
    { id: "objects",    label: "Objects & Tools",        icon: "💡" },
    { id: "symbols",    label: "Symbols & Signs",        icon: "🔣" },
    { id: "flags",      label: "Flags",                  icon: "🚩" },
];

// ─── FullEmojiPicker ────────────────────────────────────────────────────────────
interface FullEmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

function FullEmojiPicker({ onSelect, onClose }: FullEmojiPickerProps) {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("recent");
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    // refs to each category section heading for jump-scroll
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        setRecentEmojis(getRecentEmojis());
        setTimeout(() => searchRef.current?.focus(), 50);
    }, []);

    const handleSelect = useCallback((emoji: string) => {
        addRecentEmoji(emoji);
        setRecentEmojis(getRecentEmojis());
        onSelect(emoji);
    }, [onSelect]);

    // Jump to section when tab is clicked
    const handleTabClick = (id: string) => {
        setActiveTab(id);
        setSearch("");
        if (id === "recent") {
            scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        const el = sectionRefs.current[id];
        if (el && scrollRef.current) {
            const offset = el.offsetTop - (scrollRef.current.offsetTop || 0);
            scrollRef.current.scrollTo({ top: offset, behavior: "smooth" });
        }
    };

    // Update active tab based on scroll position
    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const scrollTop = scrollRef.current.scrollTop;
        let current = "recent";
        for (const cat of EMOJI_CATEGORIES) {
            const el = sectionRefs.current[cat.id];
            if (el && el.offsetTop - 20 <= scrollTop) current = cat.id;
        }
        setActiveTab(current);
    }, []);

    const searchResults = useMemo(() => {
        if (!search.trim()) return null;
        // For now match any emoji string containing the typed character
        // (a proper unicode name DB would be ideal but adds no dependency here)
        return EMOJI_CATEGORIES.flatMap((cat) => cat.emojis).filter((e) =>
            e.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    return (
        <div
            className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: 336, maxHeight: 440 }}
        >
            {/* ── Search bar ── */}
            <div className="px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2 border border-transparent focus-within:border-green-500 transition-colors">
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search emoji"
                        className="flex-1 bg-transparent text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none min-w-0"
                    />
                    {search ? (
                        <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X className="w-3 h-3" />
                        </button>
                    ) : (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Category tabs (always visible) ── */}
            <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {CATEGORY_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        title={tab.label}
                        className={`flex-shrink-0 flex items-center justify-center w-8 h-9 text-[17px] transition-all ${
                            activeTab === tab.id
                                ? "border-b-[2.5px] border-green-500 text-green-600 dark:text-green-400"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-b-[2.5px] border-transparent"
                        }`}
                    >
                        {typeof tab.icon === "string" ? tab.icon : tab.icon}
                    </button>
                ))}
            </div>

            {/* ── Emoji scroll area ── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-2 pt-2 pb-3"
                style={{ minHeight: 0 }}
                onScroll={handleScroll}
            >
                {search ? (
                    /* Search results — flat grid */
                    searchResults && searchResults.length > 0 ? (
                        <>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                                Search Results
                            </p>
                            <div className="grid grid-cols-8 gap-0.5">
                                {searchResults.map((emoji, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelect(emoji)}
                                        className="flex items-center justify-center w-[38px] h-[38px] text-[22px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-xs text-gray-400 py-10">No results for &ldquo;{search}&rdquo;</p>
                    )
                ) : (
                    /* All categories stacked — WhatsApp style */
                    <>
                        {/* Recent section */}
                        <div className="mb-3">
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                                Recently Used
                            </p>
                            {recentEmojis.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">No recent emoji yet</p>
                            ) : (
                                <div className="grid grid-cols-8 gap-0.5">
                                    {recentEmojis.map((emoji, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(emoji)}
                                            className="flex items-center justify-center w-[38px] h-[38px] text-[22px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Each category section — all visible, scrollable */}
                        {EMOJI_CATEGORIES.map((cat) => (
                            <div
                                key={cat.id}
                                className="mb-3"
                                ref={(el) => { sectionRefs.current[cat.id] = el; }}
                            >
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                                    {cat.label}
                                </p>
                                <div className="grid grid-cols-8 gap-0.5">
                                    {cat.emojis.map((emoji, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(emoji)}
                                            className="flex items-center justify-center w-[38px] h-[38px] text-[22px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── ReactionsPicker ────────────────────────────────────────────────────────────
interface ReactionsPickerProps {
    postId: string;
    initialReaction?: string | null;
    initialCount?: number;
    onReact?: (postId: string, reactionType: string) => void;
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

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node))
                setShowQuickPicker(false);
            if (fullPickerRef.current && !fullPickerRef.current.contains(e.target as Node))
                setShowFullPicker(false);
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

    const handleQuickReact = (label: ReactionLabel) => {
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

    const handleMainClick = () => {
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
            {/* ── Quick reactions (LinkedIn-style hover pill) ── */}
            <div ref={containerRef} className="relative">
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
                                onClick={() => handleQuickReact(r.label)}
                                className="group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 hover:scale-150 hover:-translate-y-2 cursor-pointer"
                                title={r.label}
                            >
                                <span className="text-2xl drop-shadow select-none">{r.emoji}</span>
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-semibold shadow">
                                    {r.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleMainClick}
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

            {/* ── Full emoji picker (for comment boxes) ── */}
            {showEmojiPicker && (
                <div ref={fullPickerRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setShowFullPicker((v) => !v)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
                        title="Emoji"
                    >
                        😊
                    </button>
                    {showFullPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <FullEmojiPicker
                                onSelect={(emoji) => { onEmojiSelect?.(emoji); setShowFullPicker(false); }}
                                onClose={() => setShowFullPicker(false)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export { FullEmojiPicker };
