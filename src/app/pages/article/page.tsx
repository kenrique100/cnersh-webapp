import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Calendar,
    ChevronRight,
    Clock,
    FileText,
    Landmark,
    Search,
    ShieldCheck,
} from "lucide-react";

import Navbar from "@/components/navbar";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";

export const dynamic = "force-dynamic";

const publications = [
    {
        id: 1,
        category: "Research Ethics",
        title: "Understanding Ethics in Health Research",
        description:
            "An overview of the ethical principles that guide health research involving human participants and the responsibilities of researchers in protecting their rights, safety, dignity, and welfare.",
        date: "Research Ethics",
        readTime: "5 min read",
        featured: true,
    },
    {
        id: 2,
        category: "Ethical Review",
        title: "The Importance of Ethical Review in Health Research",
        description:
            "Ethical review provides an independent assessment of research involving human participants and helps ensure that proposed studies meet appropriate ethical standards.",
        date: "Ethical Review",
        readTime: "6 min read",
        featured: false,
    },
    {
        id: 3,
        category: "Research Governance",
        title: "Promoting Responsible Research Governance",
        description:
            "Responsible research governance supports transparency, accountability, participant protection, and confidence in health research institutions.",
        date: "Research Governance",
        readTime: "7 min read",
        featured: false,
    },
    {
        id: 4,
        category: "Participant Protection",
        title: "Protecting Human Participants in Research",
        description:
            "Participant protection remains a central consideration in ethical health research, from informed participation through the conduct and monitoring of a study.",
        date: "Participant Protection",
        readTime: "5 min read",
        featured: false,
    },
    {
        id: 5,
        category: "Research Ethics",
        title: "Ethical Principles and Responsible Research Practice",
        description:
            "Responsible research requires researchers and institutions to apply ethical principles throughout the development, implementation, and reporting of research.",
        date: "Research Ethics",
        readTime: "6 min read",
        featured: false,
    },
    {
        id: 6,
        category: "Governance",
        title: "Transparency and Accountability in Health Research",
        description:
            "Transparent processes and clearly defined responsibilities strengthen ethical oversight and contribute to responsible research practices.",
        date: "Governance",
        readTime: "4 min read",
        featured: false,
    },
];

const categories = [
    "All Publications",
    "Research Ethics",
    "Ethical Review",
    "Participant Protection",
    "Research Governance",
];

export default async function ArticlePage() {
    const session = await authSession();

    let navUser = null;
    let notificationCount = 0;

    if (session) {
        const [user, unreadCount] = await Promise.all([
            db.user.findUnique({
                where: {
                    id: session.user.id,
                },
                select: {
                    name: true,
                    email: true,
                    image: true,
                    gender: true,
                    role: true,
                },
            }),
            getUnreadNotificationCount(),
        ]);

        if (user) {
            navUser = {
                name: user.name,
                email: user.email,
                image: user.image,
                gender: user.gender,
                role: user.role,
            };
        }

        notificationCount = unreadCount;
    }

    const featuredArticle = publications.find(
        (publication) => publication.featured
    );

    const otherArticles = publications.filter(
        (publication) => !publication.featured
    );

    return (
        <div className="min-h-screen bg-[#f6f8fb] text-slate-900 dark:bg-slate-950 dark:text-white">
            <Navbar
                user={navUser}
                notificationCount={notificationCount}
            />

            {/* ============================================================
                PAGE HEADER
            ============================================================ */}
            <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex min-h-[56px] items-center gap-2 text-sm">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-blue-800 dark:text-slate-400 dark:hover:text-blue-400"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Home
                        </Link>

                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />

                        <Link
                            href="/pages"
                            className="text-slate-500 transition-colors hover:text-blue-800 dark:text-slate-400 dark:hover:text-blue-400"
                        >
                            Our Pages
                        </Link>

                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />

                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            Articles
                        </span>
                    </div>
                </div>
            </header>

            {/* ============================================================
                HERO
            ============================================================ */}
            <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
                    <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
                        <div>
                            <div className="mb-6 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-900 text-white dark:bg-blue-700">
                                    <BookOpen className="h-6 w-6" />
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-400">
                                        CNERSH
                                    </p>

                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Knowledge &amp; Publications
                                    </p>
                                </div>
                            </div>

                            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                                Articles &amp;
                                <span className="block text-blue-900 dark:text-blue-400">
                                    Publications
                                </span>
                            </h1>

                            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-400">
                                Explore information and educational resources
                                relating to health research ethics, ethical
                                review, participant protection, and responsible
                                research governance in Cameroon.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href="#publications"
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                    Browse publications
                                    <ArrowRight className="h-4 w-4" />
                                </a>

                                <Link
                                    href="/pages/about"
                                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    About CNERSH
                                </Link>
                            </div>
                        </div>

                        {/* Government publication panel */}
                        <div className="relative">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="border-b border-slate-200 bg-blue-900 px-6 py-5 dark:border-blue-800 dark:bg-blue-950">
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                                        National Ethics Committee
                                    </p>

                                    <p className="mt-2 text-xl font-bold text-white">
                                        Health Research Publications
                                    </p>
                                </div>

                                <div className="p-6">
                                    <div className="space-y-5">
                                        <div className="flex gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-400">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>

                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    Ethical Research
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                    Promoting responsible and
                                                    ethically sound health
                                                    research.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 dark:bg-slate-800" />

                                        <div className="flex gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-400">
                                                <Landmark className="h-5 w-5" />
                                            </div>

                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    Research Governance
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                    Supporting transparency,
                                                    accountability and
                                                    oversight.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 dark:bg-slate-800" />

                                        <div className="flex gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-400">
                                                <FileText className="h-5 w-5" />
                                            </div>

                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    Public Information
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                    Making ethics information
                                                    accessible to stakeholders.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================================
                PUBLICATION SEARCH / FILTER BAR
            ============================================================ */}
            <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Explore the knowledge centre
                            </p>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Browse information by publication area.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                <input
                                    type="search"
                                    placeholder="Search publications"
                                    aria-label="Search publications"
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 sm:w-64 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                        {categories.map((category, index) => (
                            <button
                                key={category}
                                type="button"
                                className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                    index === 0
                                        ? "border-blue-900 bg-blue-900 text-white dark:border-blue-700 dark:bg-blue-700"
                                        : "border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:text-blue-400"
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============================================================
                FEATURED ARTICLE
            ============================================================ */}
            <section
                id="publications"
                className="bg-[#f6f8fb] py-14 dark:bg-slate-950"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-400">
                            Featured publication
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
                            Latest from the knowledge centre
                        </h2>
                    </div>

                    {featuredArticle && (
                        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
                                {/* Publication identity */}
                                <div className="relative min-h-[300px] overflow-hidden bg-blue-950 p-8 sm:p-10 lg:min-h-[380px]">
                                    <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-blue-900" />

                                    <div className="relative flex h-full flex-col justify-between">
                                        <div>
                                            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-700 bg-blue-900 text-white">
                                                <BookOpen className="h-7 w-7" />
                                            </div>

                                            <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                                                {featuredArticle.category}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-blue-200">
                                                CNERSH Publication
                                            </p>

                                            <div className="mt-3 h-1 w-16 bg-blue-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Article information */}
                                <div className="p-7 sm:p-10">
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            {featuredArticle.date}
                                        </span>

                                        <span className="inline-flex items-center gap-1.5">
                                            <Clock className="h-4 w-4" />
                                            {featuredArticle.readTime}
                                        </span>
                                    </div>

                                    <h3 className="mt-5 max-w-2xl text-2xl font-bold leading-tight text-slate-950 sm:text-3xl dark:text-white">
                                        {featuredArticle.title}
                                    </h3>

                                    <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-400">
                                        {featuredArticle.description}
                                    </p>

                                    <div className="mt-8">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                                        >
                                            Read publication
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    )}
                </div>
            </section>

            {/* ============================================================
                PUBLICATION GRID
            ============================================================ */}
            <section className="border-t border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-400">
                                Publications
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
                                Explore our articles
                            </h2>
                        </div>

                        <p className="max-w-md text-sm leading-6 text-slate-500 sm:text-right dark:text-slate-400">
                            Information covering ethical review, participant
                            protection, research ethics, and governance.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {otherArticles.map((article) => (
                            <article
                                key={article.id}
                                className="group flex flex-col rounded-xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
                            >
                                <div className="border-b border-slate-100 p-6 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-400">
                                            {article.category}
                                        </span>

                                        <FileText className="h-5 w-5 text-slate-300 dark:text-slate-700" />
                                    </div>

                                    <h3 className="mt-5 text-lg font-bold leading-7 text-slate-950 group-hover:text-blue-800 dark:text-white dark:group-hover:text-blue-400">
                                        {article.title}
                                    </h3>
                                </div>

                                <div className="flex flex-1 flex-col p-6">
                                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
                                        {article.description}
                                    </p>

                                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            {article.readTime}
                                        </span>

                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 transition-colors hover:text-blue-950 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Read
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============================================================
                WHY PUBLICATIONS MATTER
            ============================================================ */}
            <section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-400">
                                Knowledge &amp; awareness
                            </p>

                            <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 dark:text-white">
                                Supporting informed and responsible health
                                research
                            </h2>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                                <ShieldCheck className="h-6 w-6 text-blue-800 dark:text-blue-400" />

                                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                                    Protecting participants
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    Ethical information helps stakeholders
                                    understand the importance of protecting
                                    people who participate in research.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                                <Landmark className="h-6 w-6 text-blue-800 dark:text-blue-400" />

                                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                                    Strengthening governance
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    Accessible information supports
                                    transparency, accountability, and
                                    responsible research governance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================================
                FOOTER
            ============================================================ */}
            <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                CNERSH
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                National Ethics Committee for Health Research
                                on Humans
                            </p>
                        </div>

                        <div className="text-xs text-slate-500 md:text-right dark:text-slate-400">
                            <p>
                                &copy; {new Date().getFullYear()} CNERSH.
                            </p>
                            <p className="mt-1">
                                All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}