import Image from "next/image";
import Link from "next/link";

import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    FileQuestion,
    Headphones,
    HelpCircle,
    Mail,
    MapPin,
    MessageSquare,
    ShieldCheck,
} from "lucide-react";

import SupportForm from "@/components/support-form";
import Navbar from "@/components/navbar";
import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getPages } from "@/app/actions/page-actions";

const supportTopics = [
    {
        icon: FileQuestion,
        title: "Research ethics enquiries",
        description:
            "Questions about ethics review, submission requirements, participant protection or research governance.",
    },
    {
        icon: MessageSquare,
        title: "Application support",
        description:
            "Help understanding the information or documentation required when preparing a submission.",
    },
    {
        icon: ShieldCheck,
        title: "Compliance questions",
        description:
            "General questions concerning ethical obligations, approved protocols, amendments and continuing oversight.",
    },
    {
        icon: HelpCircle,
        title: "Website assistance",
        description:
            "Report broken links, accessibility barriers, technical problems or difficulties using the website.",
    },
];

const supportSteps = [
    {
        number: "01",
        title: "Describe your request",
        text: "Clearly explain the question, problem or service you need assistance with.",
    },
    {
        number: "02",
        title: "Provide relevant details",
        text: "Where applicable, include the submission reference, page, document or process you are asking about.",
    },
    {
        number: "03",
        title: "Receive guidance",
        text: "The appropriate support channel can provide information or direct your request to the relevant process.",
    },
];

function Footer() {
    return (
        <footer className="border-t border-slate-800 bg-slate-950 text-white">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-12 lg:px-8">
                <div className="min-w-0">
                    <Link
                        href="/"
                        className="inline-flex max-w-full items-center gap-3 sm:gap-4"
                    >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-lg sm:h-16 sm:w-16">
                            <Image
                                src="/logo.png"
                                alt="CNERSH logo"
                                width={64}
                                height={64}
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <div className="min-w-0">
                            <p className="text-lg font-bold tracking-tight text-white sm:text-xl">
                                CNERSH
                            </p>

                            <p className="text-xs text-slate-400 sm:text-sm">
                                National Ethics Committee
                            </p>
                        </div>
                    </Link>

                    <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
                        Supporting ethical, scientifically sound and responsible
                        health research while protecting the dignity, rights,
                        safety and welfare of research participants.
                    </p>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-white sm:text-base">
                        Explore
                    </h3>

                    <nav
                        aria-label="Explore"
                        className="mt-4 space-y-3 text-sm text-slate-400"
                    >
                        <Link
                            className="block transition-colors hover:text-white"
                            href="/pages/about"
                        >
                            About CNERSH
                        </Link>

                        <Link
                            className="block transition-colors hover:text-white"
                            href="/pages/article"
                        >
                            Articles &amp; Resources
                        </Link>

                        <Link
                            className="block transition-colors hover:text-white"
                            href="/pages/accessibility"
                        >
                            Accessibility
                        </Link>
                    </nav>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-white sm:text-base">
                        Legal
                    </h3>

                    <nav
                        aria-label="Legal"
                        className="mt-4 space-y-3 text-sm text-slate-400"
                    >
                        <Link
                            className="block transition-colors hover:text-white"
                            href="/pages/privacy-terms"
                        >
                            Privacy &amp; Terms
                        </Link>

                        <Link
                            className="block transition-colors hover:text-white"
                            href="/pages/support"
                        >
                            Support
                        </Link>
                    </nav>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-center text-xs text-slate-500 sm:px-6 sm:text-left lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <p>
                        © {new Date().getFullYear()} CNERSH. All rights
                        reserved.
                    </p>

                    <p>
                        Health research ethics and governance in Cameroon.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default async function SupportPage() {
    /*
     * Support submission is an authenticated operation.
     * authIsRequired() redirects unauthenticated users and unverified users.
     */
    const session = await authIsRequired();

    const supportUser = {
        name: session.user.name || "CNERSH User",
        email: session.user.email || "",
    };

    // Fetch navbar-related data in parallel.
    let navUser: {
        name: string | null;
        email: string;
        image: string | null;
        gender: string | null;
        role: string | null;
    } | null = null;

    let notificationCount = 0;
    let pages: Awaited<ReturnType<typeof getPages>> = [];

    try {
        const [dbUser, unread, pagesData] = await Promise.all([
            db.user.findUnique({
                where: { id: session.user.id },
                select: {
                    name: true,
                    email: true,
                    image: true,
                    gender: true,
                    role: true,
                },
            }),
            getUnreadNotificationCount().catch(() => 0),
            getPages().catch(() => []),
        ]);

        if (dbUser) navUser = dbUser;
        notificationCount = unread;
        pages = pagesData;
    } catch (error) {
        console.error("Error fetching navbar data:", error);
    }

    return (
        <>
            <Navbar
                user={navUser}
                notificationCount={notificationCount}
                pages={pages}
            />

            <main className="min-h-screen overflow-x-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                <section className="relative isolate min-h-[560px] overflow-hidden bg-slate-950 sm:min-h-[600px] lg:min-h-[620px]">
                    <Image
                        src="/support.png"
                        alt=""
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover object-center"
                    />

                    <div className="absolute inset-0 bg-slate-950/75" />

                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/30" />

                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.22),transparent_38%)]" />

                    <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

                    <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-cyan-400/5 blur-3xl" />

                    <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-center px-5 py-16 sm:min-h-[600px] sm:px-6 sm:py-20 lg:min-h-[620px] lg:px-8 lg:py-24">
                        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
                            <div className="min-w-0 max-w-3xl">
                                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-sm sm:px-4 sm:text-sm">
                                    <Headphones className="h-4 w-4 shrink-0" />
                                    <span>CNERSH Support</span>
                                </div>

                                <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white sm:mt-7 sm:text-5xl lg:text-6xl">
                                    How can we{" "}
                                    <span className="text-emerald-400">
                                        help?
                                    </span>
                                </h1>

                                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
                                    Find guidance for research ethics questions,
                                    submission support, compliance enquiries and
                                    technical issues with the CNERSH platform.
                                </p>

                                <div className="mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
                                    <a
                                        href="#contact-form"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition duration-200 hover:bg-emerald-400 sm:w-auto"
                                    >
                                        Contact support
                                        <ArrowRight className="h-4 w-4" />
                                    </a>

                                    <Link
                                        href="/pages/article"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition duration-200 hover:bg-white/10 sm:w-auto"
                                    >
                                        Browse resources
                                    </Link>
                                </div>
                            </div>

                            <div className="hidden lg:flex lg:justify-end">
                                <div className="relative flex h-[360px] w-[360px] items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border border-emerald-400/20" />

                                    <div className="absolute inset-7 rounded-full border border-emerald-400/10" />

                                    <div className="absolute inset-14 rounded-full bg-emerald-400/5 backdrop-blur-sm" />

                                    <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-md xl:h-64 xl:w-64">
                                        <Image
                                            src="/support.png"
                                            alt="CNERSH support"
                                            width={500}
                                            height={500}
                                            className="h-full w-full rounded-[1.5rem] object-cover opacity-80"
                                        />

                                        <div className="absolute inset-3 rounded-[1.5rem] bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                                        <div className="absolute flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-slate-950/50 text-emerald-400 shadow-xl backdrop-blur-md">
                                            <Headphones className="h-8 w-8" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent dark:from-slate-950" />
                </section>

                <section className="px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm dark:text-emerald-400">
                                Support areas
                            </p>

                            <h2 className="mt-3 text-3xl font-black tracking-tight sm:mt-4 sm:text-4xl">
                                Find the right kind of assistance
                            </h2>

                            <p className="mt-4 text-sm leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8 dark:text-slate-300">
                                Select the area closest to your request so that
                                your enquiry can be described clearly.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 xl:grid-cols-4">
                            {supportTopics.map((topic) => {
                                const Icon = topic.icon;

                                return (
                                    <a
                                        key={topic.title}
                                        href="#contact-form"
                                        className="group min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl sm:p-7 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                            <Icon className="h-6 w-6" />
                                        </div>

                                        <h3 className="mt-5 break-words font-bold sm:mt-6">
                                            {topic.title}
                                        </h3>

                                        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                            {topic.description}
                                        </p>

                                        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                            Get assistance
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="bg-slate-50 px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 dark:bg-slate-900/60">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start lg:gap-14">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm dark:text-emerald-400">
                                    Support process
                                </p>

                                <h2 className="mt-3 text-3xl font-black sm:mt-4 sm:text-4xl">
                                    A simple way to get assistance
                                </h2>

                                <p className="mt-4 text-sm leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8 dark:text-slate-300">
                                    Clear information helps support requests reach
                                    the appropriate channel more efficiently.
                                </p>

                                <div className="mt-7 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:mt-8 sm:p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <Clock3 className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                                    <h3 className="mt-4 font-bold">
                                        Before contacting support
                                    </h3>

                                    <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                                        Have the relevant study, submission, page
                                        or technical issue details available where
                                        appropriate.
                                    </p>
                                </div>
                            </div>

                            <div className="min-w-0 space-y-4 sm:space-y-5">
                                {supportSteps.map((step) => (
                                    <div
                                        key={step.number}
                                        className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:gap-5 sm:p-7 dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white sm:h-11 sm:w-11 sm:text-sm">
                                            {step.number}
                                        </span>

                                        <div className="min-w-0">
                                            <h3 className="break-words font-bold">
                                                {step.title}
                                            </h3>

                                            <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-400">
                                                {step.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
                                <Mail className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                                <h3 className="mt-5 font-bold">
                                    Email enquiries
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                    Use the support form to submit a detailed
                                    enquiry and provide the information needed to
                                    understand your request.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
                                <MapPin className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                                <h3 className="mt-5 font-bold">
                                    Institutional support
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                    Research institutions and investigators should
                                    use the appropriate official communication
                                    channel for formal submissions and regulatory
                                    matters.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 md:col-span-2 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
                                <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                                <h3 className="mt-5 font-bold">
                                    Confidential information
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                    Do not include unnecessary participant
                                    identifiers or sensitive research information
                                    in a general website enquiry.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="contact-form"
                    className="scroll-mt-16 bg-slate-950 px-5 py-12 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-20"
                >
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-14">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 sm:text-sm">
                                    Contact support
                                </p>

                                <h2 className="mt-3 text-3xl font-black sm:mt-4 sm:text-4xl">
                                    Send your enquiry
                                </h2>

                                <p className="mt-4 text-sm leading-7 text-slate-300 sm:mt-5 sm:text-base sm:leading-8">
                                    Use the form to describe your question or
                                    technical problem. Provide enough context to
                                    make your request understandable while avoiding
                                    unnecessary confidential or personally
                                    identifiable information.
                                </p>

                                <div className="mt-7 space-y-4 sm:mt-8">
                                    {[
                                        "Describe the issue clearly.",
                                        "Include relevant reference information where appropriate.",
                                        "Avoid unnecessary participant identifiers.",
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-start gap-3"
                                        >
                                            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-400" />

                                            <span className="text-sm leading-6 text-slate-300">
                                                {item}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:mt-10 sm:p-6">
                                    <ShieldCheck className="h-7 w-7 text-emerald-400" />

                                    <h3 className="mt-4 font-bold text-white">
                                        Protect sensitive information
                                    </h3>

                                    <p className="mt-2 text-sm leading-7 text-slate-400">
                                        The support form is intended for support
                                        enquiries. Avoid placing unnecessary
                                        participant identifiers or sensitive
                                        research data in the message.
                                    </p>
                                </div>
                            </div>

                            <div className="min-w-0 rounded-[1.5rem] bg-white p-3 shadow-2xl sm:rounded-[2rem] sm:p-5 dark:bg-slate-900">
                                <SupportForm user={supportUser} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
                    <div className="mx-auto max-w-4xl rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-10 lg:p-12 dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-2xl font-bold sm:text-3xl">
                            Looking for information before contacting support?
                        </h2>

                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                            Explore CNERSH information about its role, research
                            ethics, governance, protocol policies and participant
                            protection.
                        </p>

                        <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                            <Link
                                href="/pages/about"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 sm:w-auto"
                            >
                                About CNERSH
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link
                                href="/pages/article"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold transition hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                Research resources
                            </Link>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}