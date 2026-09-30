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
        title: "Keyboard Navigation",
        description:
            "Interactive controls should be reachable and usable through keyboard navigation without requiring a mouse.",
    },
    {
        icon: Eye,
        title: "Readable Visual Design",
        description:
            "The interface uses clear hierarchy, spacing and visual structure to make information easier to locate and understand.",
    },
    {
        icon: Type,
        title: "Clear Typography",
        description:
            "Content is structured using headings, readable text sizes and meaningful visual distinctions.",
    },
    {
        icon: Volume2,
        title: "Assistive Technologies",
        description:
            "Semantic HTML, labels and accessible interface patterns help support screen readers and other assistive technologies.",
    },
    {
        icon: MonitorSmartphone,
        title: "Responsive Experience",
        description:
            "Pages are designed to remain usable across desktop, tablet and mobile screen sizes.",
    },
    {
        icon: MousePointer2,
        title: "Visible Interaction",
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

const principles = [
    {
        title: "Perceivable",
        description:
            "Information should be presented in ways people can perceive through different senses and technologies.",
    },
    {
        title: "Operable",
        description:
            "Navigation and interaction should not depend on one particular input method.",
    },
    {
        title: "Understandable",
        description:
            "Content, navigation and interface behaviour should be clear and predictable.",
    },
    {
        title: "Robust",
        description:
            "Content should work reliably across modern browsers, devices and assistive technologies.",
    },
];

function Footer() {
    return (
        <footer className="border-t border-slate-800 bg-slate-950 text-white">
            <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
                <div>
                    <Link href="/" className="inline-flex items-center gap-3">
                        <Image
                            src="/logo.png"
                            alt="CNERSH logo"
                            width={52}
                            height={52}
                            className="h-13 w-13 rounded-lg bg-white object-contain p-1"
                        />

                        <div>
                            <p className="text-lg font-bold">CNERSH</p>

                            <p className="text-xs text-slate-400">
                                National Ethics Committee
                            </p>
                        </div>
                    </Link>

                    <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                        Ethical research governance, participant protection and
                        responsible health research in Cameroon.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold">Pages</h3>

                    <div className="mt-4 space-y-3 text-sm text-slate-400">
                        <Link
                            className="block transition hover:text-white"
                            href="/pages/about"
                        >
                            About
                        </Link>

                        <Link
                            className="block transition hover:text-white"
                            href="/pages/article"
                        >
                            Articles
                        </Link>

                        <Link
                            className="block transition hover:text-white"
                            href="/pages/privacy-terms"
                        >
                            Privacy &amp; Terms
                        </Link>

                        <Link
                            className="block transition hover:text-white"
                            href="/pages/accessibility"
                        >
                            Accessibility
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Need assistance?</h3>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        If you encounter an accessibility barrier or need
                        assistance, contact the support team.
                    </p>

                    <Link
                        href="/pages/support"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition hover:text-white"
                    >
                        Contact support
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <p>
                        © {new Date().getFullYear()} CNERSH. All rights reserved.
                    </p>

                    <p>Accessibility and inclusive digital access.</p>
                </div>
            </div>
        </footer>
    );
}

export default function AccessibilityPage() {
    return (
        <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">

            {/* Hero */}
            <section className="relative isolate min-h-[620px] overflow-hidden bg-slate-950">

                <Image
                    src="/about-hero.png"
                    alt=""
                    fill
                    priority
                    className="object-cover object-center opacity-25"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-emerald-950/80" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.20),transparent_35%)]" />

                <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-20 lg:px-8 lg:py-28">
                    <div className="grid w-full items-center gap-14 lg:grid-cols-[1.15fr_.85fr]">

                        <div className="max-w-3xl">

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 backdrop-blur-sm">
                                    <Accessibility className="h-4 w-4" />
                                    Accessibility
                                </div>

                                <div className="h-1 w-1 rounded-full bg-emerald-400" />

                                <p className="text-sm font-medium text-slate-300">
                                    Inclusive Digital Access
                                </p>
                            </div>

                            <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                                Designed for more people to{" "}
                                <span className="text-emerald-400">
                                    access, understand and use.
                                </span>
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                                CNERSH aims to make its digital information and
                                services accessible and usable across devices,
                                abilities and methods of interaction.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href="#commitment"
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                                >
                                    Accessibility commitments
                                    <ArrowRight className="h-4 w-4" />
                                </a>

                                <Link
                                    href="/pages/support"
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/10"
                                >
                                    Contact support
                                </Link>
                            </div>

                            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500">
                                        Focus
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        Inclusive access
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500">
                                        Experience
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        Responsive design
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500">
                                        Support
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        User assistance
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:flex lg:justify-end">
                            <div className="relative flex h-[360px] w-[360px] items-center justify-center">

                                <div className="absolute inset-0 rounded-full border border-emerald-400/20" />

                                <div className="absolute inset-7 rounded-full border border-emerald-400/10" />

                                <div className="absolute inset-14 rounded-full bg-emerald-400/5 backdrop-blur-sm" />

                                <div className="relative flex h-48 w-48 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-md">

                                    <Image
                                        src="/minsante_logo.png"
                                        alt="Cameroon Ministry of Public Health"
                                        width={170}
                                        height={170}
                                        className="h-full w-full object-contain"
                                    />

                                </div>

                                <div className="absolute right-2 top-16 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-md">
                                    <p className="text-xs font-semibold text-emerald-300">
                                        Inclusive
                                    </p>

                                    <p className="mt-1 text-xs text-slate-300">
                                        Digital access
                                    </p>
                                </div>

                                <div className="absolute bottom-12 left-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-md">
                                    <p className="text-xs font-semibold text-white">
                                        Accessible
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Public service
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Introduction */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                        Our approach
                    </p>

                    <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                        Accessibility is part of good public digital service
                    </h2>

                    <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                        Accessibility means reducing unnecessary barriers so that
                        people can navigate information, understand content and
                        interact with services using different devices and
                        assistive technologies.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section className="bg-slate-50 px-6 py-20 dark:bg-slate-900/60 lg:px-8">
                <div className="mx-auto max-w-7xl">

                    <div className="max-w-2xl">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                            Accessible experience
                        </p>

                        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                            Built around practical accessibility
                        </h2>

                        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">
                            The interface is designed to support different ways
                            of accessing and interacting with digital information.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {accessibilityFeatures.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <article
                                    key={feature.title}
                                    className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-400">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    <h3 className="mt-6 text-xl font-bold">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                                        {feature.description}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Commitment */}
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

                            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                                Practical accessibility principles
                            </h2>

                            <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                                The interface is designed around common
                                accessibility principles including clear
                                structure, keyboard access, readable content
                                and compatibility with assistive technology.
                            </p>

                            <div className="mt-8 rounded-3xl bg-slate-950 p-7 text-white">
                                <Accessibility className="h-8 w-8 text-emerald-400" />

                                <h3 className="mt-5 text-xl font-bold">
                                    Inclusive by design
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-400">
                                    Accessibility should be considered throughout
                                    the digital experience rather than treated as
                                    an additional feature.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {commitments.map((commitment) => (
                                <div
                                    key={commitment}
                                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
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

            {/* Accessibility principles */}
            <section className="bg-slate-950 px-6 py-20 text-white lg:px-8">
                <div className="mx-auto max-w-7xl">

                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                            Four accessibility principles
                        </p>

                        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                            Information should be perceivable, operable,
                            understandable and robust
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {principles.map((principle, index) => (
                            <article
                                key={principle.title}
                                className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/30 hover:bg-white/10"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-400">
                                    0{index + 1}
                                </div>

                                <h3 className="mt-6 font-bold text-emerald-300">
                                    {principle.title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-300">
                                    {principle.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Report */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-4xl">

                    <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:p-12">

                        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />

                        <div className="relative">
                            <ScreenShare className="h-9 w-9 text-emerald-700 dark:text-emerald-400" />

                            <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                                Encountered an accessibility barrier?
                            </h2>

                            <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
                                If a page, document, form or interaction creates a
                                barrier, please let the support team know. Include
                                the page you were trying to access, the problem
                                you encountered and, where possible, the device
                                or browser you were using.
                            </p>

                            <Link
                                href="/pages/support"
                                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                            >
                                Report an issue
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}