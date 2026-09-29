"use client";

import Image from "next/image";
import Link from "next/link";
import {
    Accessibility,
    ArrowRight,
    CheckCircle2,
    Eye,
    Keyboard,
    MonitorSmartphone,
    MousePointer2,
    ScreenShare,
    Type,
    Volume2,
} from "lucide-react";

const accessibilityFeatures = [
    {
        icon: Keyboard,
        title: "Keyboard navigation",
        description:
            "Interactive controls should be reachable and usable through keyboard navigation without requiring a mouse.",
    },
    {
        icon: Eye,
        title: "Readable visual design",
        description:
            "The interface uses clear hierarchy, spacing and visual structure to make information easier to locate and understand.",
    },
    {
        icon: Type,
        title: "Clear typography",
        description:
            "Content is structured using headings, readable text sizes and meaningful visual distinctions.",
    },
    {
        icon: Volume2,
        title: "Assistive technologies",
        description:
            "Semantic HTML, labels and accessible interface patterns help support screen readers and other assistive technologies.",
    },
    {
        icon: MonitorSmartphone,
        title: "Responsive experience",
        description:
            "Pages are designed to remain usable across desktop, tablet and mobile screen sizes.",
    },
    {
        icon: MousePointer2,
        title: "Visible interaction",
        description:
            "Links and interactive elements should provide clear visual feedback when users interact with them.",
    },
];

const commitments = [
    "Use meaningful page titles and hierarchical headings.",
    "Provide alternative text for meaningful images.",
    "Maintain accessible labels for forms and controls.",
    "Support keyboard navigation across interactive elements.",
    "Use sufficient visual contrast for important content.",
    "Avoid communicating essential information through colour alone.",
    "Keep navigation structures predictable and consistent.",
    "Design content to remain usable across different screen sizes.",
];

function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-slate-950 text-white dark:border-slate-800">
            <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
                <div>
                    <Link href="/" className="inline-flex items-center gap-3">
                        <Image
                            src="/logo.png"
                            alt="CNERSH logo"
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain"
                        />
                        <div>
                            <p className="font-bold">CNERSH</p>
                            <p className="text-xs text-slate-400">
                                National Ethics Committee
                            </p>
                        </div>
                    </Link>

                    <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                        Ethical research governance, participant protection and responsible
                        health research in Cameroon.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold">Pages</h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-400">
                        <Link className="block hover:text-white" href="/pages/about">
                            About
                        </Link>
                        <Link className="block hover:text-white" href="/pages/article">
                            Articles
                        </Link>
                        <Link
                            className="block hover:text-white"
                            href="/pages/privacy-terms"
                        >
                            Privacy & Terms
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Need assistance?</h3>
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        If you encounter an accessibility barrier or need assistance,
                        contact the support team.
                    </p>
                    <Link
                        href="/pages/support"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-white"
                    >
                        Contact support
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <p>© {new Date().getFullYear()} CNERSH. All rights reserved.</p>
                    <p>Accessibility and inclusive digital access.</p>
                </div>
            </div>
        </footer>
    );
}

export default function AccessibilityPage() {
    return (
        <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
            {/* HERO */}
            <section className="overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                            <Accessibility className="h-4 w-4" />
                            Accessibility
                        </div>

                        <h1 className="mt-7 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                            Designed for more people to access, understand and use.
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                            CNERSH aims to make its digital information and services
                            accessible and usable across devices, abilities and methods of
                            interaction.
                        </p>

                        <a
                            href="#commitment"
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-400"
                        >
                            Accessibility commitments
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>

                    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl">
                        <Image
                            src="/about-hero.png"
                            alt="Accessible digital research information"
                            width={800}
                            height={600}
                            className="h-[380px] w-full rounded-[1.5rem] object-cover opacity-90"
                        />
                    </div>
                </div>
            </section>

            {/* INTRO */}
            <section className="px-6 py-16 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                        Our approach
                    </p>

                    <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                        Accessibility is part of good public digital service
                    </h2>

                    <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                        Accessibility means reducing unnecessary barriers so that people
                        can navigate information, understand content and interact with
                        services using different devices and assistive technologies.
                    </p>
                </div>
            </section>

            {/* FEATURES */}
            <section className="bg-slate-50 px-6 py-20 dark:bg-slate-900/60 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {accessibilityFeatures.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <article
                                    key={feature.title}
                                    className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>

                                    <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                                        {feature.description}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* COMMITMENT */}
            <section
                id="commitment"
                className="scroll-mt-20 px-6 py-20 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                                Accessibility commitments
                            </p>

                            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                                Practical accessibility principles
                            </h2>

                            <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                                The interface is designed around common accessibility
                                principles including clear structure, keyboard access,
                                readable content and compatibility with assistive technology.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {commitments.map((commitment) => (
                                <div
                                    key={commitment}
                                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                                        {commitment}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* WCAG */}
            <section className="bg-slate-950 px-6 py-20 text-white lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                            Four accessibility principles
                        </p>

                        <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                            Information should be perceivable, operable, understandable and
                            robust
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            [
                                "Perceivable",
                                "Information should be presented in ways people can perceive through different senses and technologies.",
                            ],
                            [
                                "Operable",
                                "Navigation and interaction should not depend on one particular input method.",
                            ],
                            [
                                "Understandable",
                                "Content, navigation and interface behaviour should be clear and predictable.",
                            ],
                            [
                                "Robust",
                                "Content should work reliably across modern browsers, devices and assistive technologies.",
                            ],
                        ].map(([title, description]) => (
                            <article
                                key={title}
                                className="rounded-3xl border border-white/10 bg-white/5 p-6"
                            >
                                <h3 className="font-bold text-emerald-300">{title}</h3>
                                <p className="mt-3 text-sm leading-7 text-slate-300">
                                    {description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* REPORT */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-4xl rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:p-12">
                    <ScreenShare className="h-9 w-9 text-emerald-700 dark:text-emerald-400" />

                    <h2 className="mt-5 text-2xl font-bold sm:text-3xl">
                        Encountered an accessibility barrier?
                    </h2>

                    <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
                        If a page, document, form or interaction creates a barrier, please
                        let the support team know. Include the page you were trying to
                        access, the problem you encountered and, where possible, the
                        device or browser you were using.
                    </p>

                    <Link
                        href="/pages/support"
                        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
                    >
                        Report an issue
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <Footer />
        </main>
    );
}