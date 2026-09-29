import Link from "next/link";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChevronRightIcon,
    FileTextIcon,
    LandmarkIcon,
    ShieldCheckIcon,
    UserRoundIcon,
} from "lucide-react";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

/**
 * CNERSH Articles & Publications
 *
 * Route:
 * /pages/article
 *
 * This page is intentionally designed as an institutional editorial hub.
 * Article content can later be connected to a database/CMS without
 * changing the overall page structure.
 */

const articleCategories = [
    {
        title: "Research Ethics",
        description:
            "Articles and educational resources on ethical principles, human participant protection, and responsible health research.",
        icon: ShieldCheckIcon,
    },
    {
        title: "Ethical Review",
        description:
            "Information explaining the ethical review process and the responsibilities of researchers and review stakeholders.",
        icon: FileTextIcon,
    },
    {
        title: "Research Governance",
        description:
            "Institutional perspectives on governance, accountability, transparency, and standards in health research.",
        icon: LandmarkIcon,
    },
];

const featuredArticles = [
    {
        category: "Research Ethics",
        title: "Understanding Ethics in Health Research",
        excerpt:
            "An introduction to the principles that guide ethical health research involving human participants, with emphasis on respect, protection, accountability, and responsible research practice.",
        date: "Research Ethics Resource",
        readTime: "5 min read",
    },
    {
        category: "Ethical Review",
        title: "Why Ethical Review Matters",
        excerpt:
            "Ethical review provides an important safeguard for research participants while supporting scientifically and ethically responsible health research.",
        date: "Ethical Review Resource",
        readTime: "4 min read",
    },
    {
        category: "Research Governance",
        title: "Building Trust in Health Research",
        excerpt:
            "Transparent ethical oversight, clear responsibilities, and protection of participants contribute to public confidence in health research.",
        date: "Governance Resource",
        readTime: "6 min read",
    },
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

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
            <Navbar
                user={navUser}
                notificationCount={notificationCount}
            />

            <main>
                {/* =========================================================
                    HERO
                ========================================================== */}
                <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
                        {/* Breadcrumb */}
                        <nav
                            aria-label="Breadcrumb"
                            className="mb-8 flex items-center gap-2 text-sm"
                        >
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 text-gray-500 transition-colors hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                                <span>Home</span>
                            </Link>

                            <ChevronRightIcon className="h-4 w-4 text-gray-300 dark:text-gray-700" />

                            <Link
                                href="/pages"
                                className="text-gray-500 transition-colors hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400"
                            >
                                Our Pages
                            </Link>

                            <ChevronRightIcon className="h-4 w-4 text-gray-300 dark:text-gray-700" />

                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                Articles
                            </span>
                        </nav>

                        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_0.6fr]">
                            <div>
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                    <BookOpenIcon className="h-4 w-4" />
                                    CNERSH Publications
                                </div>

                                <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl dark:text-white">
                                    Articles &amp; Publications
                                </h1>

                                <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg dark:text-gray-400">
                                    Explore educational resources, institutional
                                    perspectives, and information relating to
                                    health research ethics, ethical review, and
                                    responsible research governance in Cameroon.
                                </p>

                                <div className="mt-8 flex flex-wrap items-center gap-3">
                                    <a
                                        href="#articles"
                                        className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
                                    >
                                        Explore articles
                                        <ArrowRightIcon className="h-4 w-4" />
                                    </a>

                                    <Link
                                        href="/pages/about"
                                        className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                        About CNERSH
                                    </Link>
                                </div>
                            </div>

                            {/* Institutional visual */}
                            <div className="relative">
                                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                    <div className="relative min-h-[280px] p-6 sm:p-8">
                                        <div
                                            aria-hidden="true"
                                            className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-blue-100 dark:bg-blue-950/50"
                                        />

                                        <div className="relative flex h-full min-h-[230px] flex-col justify-between">
                                            <div className="flex items-center justify-between">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-800 text-white dark:bg-blue-600">
                                                    <LandmarkIcon className="h-6 w-6" />
                                                </div>

                                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                                    CNERSH
                                                </span>
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-400">
                                                    Knowledge &amp; Ethics
                                                </p>

                                                <p className="mt-2 text-2xl font-bold leading-tight text-gray-950 dark:text-white">
                                                    Supporting responsible
                                                    health research
                                                </p>

                                                <div className="mt-5 h-1 w-16 rounded-full bg-blue-800 dark:bg-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    INTRODUCTION / INSTITUTIONAL CONTEXT
                ========================================================== */}
                <section className="bg-gray-50 dark:bg-gray-950">
                    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
                                        <FileTextIcon className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-800 dark:text-blue-400">
                                            About this section
                                        </p>

                                        <h2 className="mt-1 text-xl font-bold text-gray-950 sm:text-2xl dark:text-white">
                                            Knowledge for researchers and the
                                            public
                                        </h2>

                                        <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base dark:text-gray-400">
                                            The Articles &amp; Publications
                                            section provides a structured space
                                            for information related to health
                                            research ethics and ethical
                                            governance. Content can be used to
                                            communicate institutional knowledge,
                                            explain ethical review concepts,
                                            and support understanding among
                                            researchers, research participants,
                                            institutions, and members of the
                                            public.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick information */}
                            <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Publication areas
                                </p>

                                <div className="mt-5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                Participant protection
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                Ethical principles and
                                                responsible research practice.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <FileTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                Ethical review
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                Guidance and educational
                                                information about review.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <LandmarkIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                Governance
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                Accountability and ethical
                                                oversight in health research.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    CATEGORIES
                ========================================================== */}
                <section className="border-y border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                        <div className="max-w-2xl">
                            <p className="text-xs font-semibold uppercase tracking-widest text-blue-800 dark:text-blue-400">
                                Browse by topic
                            </p>

                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl dark:text-white">
                                Research ethics knowledge areas
                            </h2>

                            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
                                Content can be organized around the major
                                themes relevant to ethical health research and
                                institutional oversight.
                            </p>
                        </div>

                        <div className="mt-8 grid gap-5 md:grid-cols-3">
                            {articleCategories.map((category) => {
                                const Icon = category.icon;

                                return (
                                    <article
                                        key={category.title}
                                        className="group rounded-xl border border-gray-200 bg-gray-50 p-6 transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                                    >
                                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-950 dark:text-blue-400 dark:ring-gray-800">
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <h3 className="mt-5 text-base font-bold text-gray-950 dark:text-white">
                                            {category.title}
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                            {category.description}
                                        </p>

                                        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 dark:text-blue-400">
                                            Explore topic
                                            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    ARTICLES
                ========================================================== */}
                <section
                    id="articles"
                    className="bg-gray-50 dark:bg-gray-950"
                >
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-blue-800 dark:text-blue-400">
                                    Featured resources
                                </p>

                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl dark:text-white">
                                    Articles &amp; educational resources
                                </h2>
                            </div>

                            <p className="max-w-md text-sm leading-6 text-gray-500 sm:text-right dark:text-gray-400">
                                A structured publication area ready for
                                CNERSH-approved articles, guidance, and
                                institutional resources.
                            </p>
                        </div>

                        <div className="mt-8 grid gap-6 lg:grid-cols-3">
                            {featuredArticles.map((article, index) => (
                                <article
                                    key={article.title}
                                    className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 ${
                                        index === 0
                                            ? "lg:col-span-1"
                                            : ""
                                    }`}
                                >
                                    {/* Article visual header */}
                                    <div className="relative h-40 overflow-hidden border-b border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-950">
                                        <div className="absolute inset-0 flex items-end p-6">
                                            <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-blue-800 shadow-sm dark:bg-gray-900/90 dark:text-blue-400">
                                                <BookOpenIcon className="h-5 w-5" />
                                            </div>

                                            <div>
                                                <span className="inline-flex rounded-full bg-blue-800 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-blue-600">
                                                    {article.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col p-6">
                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                                {article.date}
                                            </span>

                                            <span>{article.readTime}</span>
                                        </div>

                                        <h3 className="mt-4 text-lg font-bold leading-7 text-gray-950 group-hover:text-blue-800 dark:text-white dark:group-hover:text-blue-400">
                                            {article.title}
                                        </h3>

                                        <p className="mt-3 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                            {article.excerpt}
                                        </p>

                                        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-400">
                                                Read article
                                                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    INSTITUTIONAL CTA
                ========================================================== */}
                <section className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                        <div className="overflow-hidden rounded-2xl border border-blue-900 bg-blue-900 shadow-sm dark:border-blue-800 dark:bg-blue-950">
                            <div className="grid items-center gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:px-10 lg:py-10">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                                            <UserRoundIcon className="h-5 w-5" />
                                        </div>

                                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
                                            Researchers &amp; stakeholders
                                        </p>
                                    </div>

                                    <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                                        Looking for more information?
                                    </h2>

                                    <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                                        Visit the institutional pages to learn
                                        more about CNERSH, its role in health
                                        research ethics, and the services
                                        available through the platform.
                                    </p>
                                </div>

                                <Link
                                    href="/pages/about"
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900"
                                >
                                    Learn about CNERSH
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* =============================================================
                FOOTER
            ============================================================= */}
            <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            CNERSH
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            National Ethics Committee for Health Research on
                            Humans
                        </p>
                    </div>

                    <p className="text-xs text-gray-500 lg:text-right dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNERSH. All rights
                        reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}