"use client";

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
                        Supporting ethical, scientifically sound and responsible health
                        research while protecting the dignity, rights, safety and welfare
                        of research participants.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold">Explore</h3>

                    <div className="mt-4 space-y-3 text-sm text-slate-400">
                        <Link className="block hover:text-white" href="/pages/about">
                            About CNERSH
                        </Link>

                        <Link className="block hover:text-white" href="/pages/article">
                            Articles & Resources
                        </Link>

                        <Link
                            className="block hover:text-white"
                            href="/pages/accessibility"
                        >
                            Accessibility
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Legal</h3>

                    <div className="mt-4 space-y-3 text-sm text-slate-400">
                        <Link
                            className="block hover:text-white"
                            href="/pages/privacy-terms"
                        >
                            Privacy & Terms
                        </Link>

                        <Link className="block hover:text-white" href="/pages/support">
                            Support
                        </Link>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <p>© {new Date().getFullYear()} CNERSH. All rights reserved.</p>

                    <p>Health research ethics and governance in Cameroon.</p>
                </div>
            </div>
        </footer>
    );
}

export default function SupportPage() {
    return (
        <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
            {/* HERO */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_38%)]" />

                <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                            <Headphones className="h-4 w-4" />
                            CNERSH Support
                        </div>

                        <h1 className="mt-7 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            How can we help?
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                            Find guidance for research ethics questions, submission support,
                            compliance enquiries and technical issues with the CNERSH
                            platform.
                        </p>

                        <div className="mt-9 flex flex-wrap gap-4">
                            <a
                                href="#contact-form"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white shadow-lg hover:bg-emerald-400"
                            >
                                Contact support
                                <ArrowRight className="h-4 w-4" />
                            </a>

                            <Link
                                href="/pages/article"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10"
                            >
                                Browse resources
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* SUPPORT CATEGORIES */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                            Support areas
                        </p>

                        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                            Find the right kind of assistance
                        </h2>

                        <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                            Select the area closest to your request so that your enquiry can
                            be described clearly.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {supportTopics.map((topic) => {
                            const Icon = topic.icon;

                            return (
                                <a
                                    key={topic.title}
                                    href="#contact-form"
                                    className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    <h3 className="mt-6 font-bold">{topic.title}</h3>

                                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                        {topic.description}
                                    </p>

                                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Get assistance
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* HOW SUPPORT WORKS */}
            <section className="bg-slate-50 px-6 py-20 dark:bg-slate-900/60 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                                Support process
                            </p>

                            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                                A simple way to get assistance
                            </h2>

                            <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                                Clear information helps support requests reach the appropriate
                                channel more efficiently.
                            </p>

                            <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                <Clock3 className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                                <h3 className="mt-4 font-bold">Before contacting support</h3>

                                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                                    Have the relevant study, submission, page or technical issue
                                    details available where appropriate.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {supportSteps.map((step) => (
                                <div
                                    key={step.number}
                                    className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-950"
                                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {step.number}
                  </span>

                                    <div>
                                        <h3 className="font-bold">{step.title}</h3>

                                        <p className="mt-2 leading-7 text-slate-600 dark:text-slate-400">
                                            {step.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTACT INFORMATION */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200 p-7 dark:border-slate-800">
                            <Mail className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                            <h3 className="mt-5 font-bold">Email enquiries</h3>

                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                Use the support form to submit a detailed enquiry and provide
                                the information needed to understand your request.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 p-7 dark:border-slate-800">
                            <MapPin className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                            <h3 className="mt-5 font-bold">Institutional support</h3>

                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                Research institutions and investigators should use the
                                appropriate official communication channel for formal
                                submissions and regulatory matters.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 p-7 dark:border-slate-800">
                            <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />

                            <h3 className="mt-5 font-bold">Confidential information</h3>

                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                Do not include unnecessary participant identifiers or sensitive
                                research information in a general website enquiry.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FORM */}
            <section
                id="contact-form"
                className="scroll-mt-20 bg-slate-950 px-6 py-20 text-white lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                                Contact support
                            </p>

                            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                                Send your enquiry
                            </h2>

                            <p className="mt-5 leading-8 text-slate-300">
                                Use the form to describe your question or technical problem.
                                Provide enough context to make your request understandable,
                                while avoiding unnecessary confidential or personally
                                identifiable information.
                            </p>

                            <div className="mt-8 space-y-4">
                                {[
                                    "Describe the issue clearly.",
                                    "Include relevant reference information where appropriate.",
                                    "Avoid unnecessary participant identifiers.",
                                ].map((item) => (
                                    <div key={item} className="flex gap-3">
                                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-400" />
                                        <span className="text-sm text-slate-300">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 text-slate-900 shadow-2xl sm:p-8 dark:bg-slate-900 dark:text-white">
                            {/*
                If your existing SupportForm component is already connected
                to the server action, replace this section with:

                <SupportForm />

                and import it from:
                @/components/support-form
              */}

                            <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-700">
                                <h3 className="text-xl font-bold">
                                    Support request information
                                </h3>

                                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    The existing CNERSH support form component should be rendered
                                    here so that its current validation and server-side
                                    submission behaviour remain connected to the application.
                                </p>

                                <div className="mt-6">
                                    <Link
                                        href="/pages/support"
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
                                    >
                                        Open support form
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-12">
                    <h2 className="text-2xl font-bold sm:text-3xl">
                        Looking for information before contacting support?
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
                        Explore CNERSH information about its role, research ethics,
                        governance, protocol policies and participant protection.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Link
                            href="/pages/about"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
                        >
                            About CNERSH
                            <ArrowRight className="h-4 w-4" />
                        </Link>

                        <Link
                            href="/pages/article"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                            Research resources
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}