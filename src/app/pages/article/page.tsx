"use client";

import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    FileText,
    Lock,
    ShieldCheck,
    UserCheck,
} from "lucide-react";

const privacySections = [
    {
        id: "information",
        title: "Information we may receive",
        icon: FileText,
        content:
            "Depending on how you use the platform, information may include details submitted through forms, contact information, account or service information where applicable, technical information about how the website is accessed, and information necessary to respond to a support request.",
    },
    {
        id: "purpose",
        title: "How information may be used",
        icon: UserCheck,
        content:
            "Information may be used to provide requested services, respond to enquiries, maintain platform functionality, improve user experience, address technical problems, support security and meet applicable administrative or legal requirements.",
    },
    {
        id: "security",
        title: "Security and confidentiality",
        icon: Lock,
        content:
            "CNERSH should apply appropriate technical and organizational safeguards to protect information against unauthorized access, loss, misuse, alteration or disclosure. Access to information should be limited according to legitimate operational needs.",
    },
    {
        id: "protection",
        title: "Research participant information",
        icon: ShieldCheck,
        content:
            "Information concerning research participants requires particular care. The existence of this website does not replace the privacy, confidentiality, consent, data-governance and security requirements that apply to an individual research project.",
    },
];

const terms = [
    {
        title: "Use the platform responsibly",
        text:
            "Users should provide accurate information where information is requested and should not intentionally misuse, disrupt or attempt to compromise the platform.",
    },
    {
        title: "Research approval remains separate",
        text:
            "Information provided through the website does not itself constitute ethical clearance, scientific approval, regulatory authorization or permission to begin a research study.",
    },
    {
        title: "Respect applicable requirements",
        text:
            "Researchers and institutions remain responsible for complying with applicable laws, regulations, approved protocols, ethics requirements and official CNERSH procedures.",
    },
    {
        title: "Official information controls",
        text:
            "Where website information differs from an applicable law, regulation, formal decision or official instrument, the applicable authoritative source should be consulted.",
    },
];

function Footer() {
    return (
        <footer className="border-t border-slate-800 bg-slate-950 text-white">
            <div className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
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
                        National health research ethics oversight and
                        coordination.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold">Information</h3>

                    <div className="mt-4 space-y-3 text-sm text-slate-400">
                        <Link
                            href="/pages/about"
                            className="block transition-colors hover:text-white"
                        >
                            About CNERSH
                        </Link>

                        <Link
                            href="/pages/article"
                            className="block transition-colors hover:text-white"
                        >
                            Articles &amp; Resources
                        </Link>

                        <Link
                            href="/pages/accessibility"
                            className="block transition-colors hover:text-white"
                        >
                            Accessibility
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Contact</h3>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        For questions about the website, information or
                        support, use the support channel.
                    </p>

                    <Link
                        href="/pages/support"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-white"
                    >
                        Contact support
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <p>
                        © {new Date().getFullYear()} CNERSH. All rights
                        reserved.
                    </p>

                    <p>Privacy, confidentiality and responsible use.</p>
                </div>
            </div>
        </footer>
    );
}

export default function PrivacyTermsPage() {
    return (
        <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
            {/* Hero */}
            <section className="relative isolate min-h-[620px] overflow-hidden">
                <div className="absolute inset-0 -z-30">
                    <Image
                        src="/ministry.png"
                        alt="Public engagement and participation"
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover object-right"
                    />
                </div>

                <div className="absolute inset-0 -z-20 bg-slate-950/60" />

                <div className="absolute inset-0 -z-20 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/25" />

                <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-slate-950/60 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                <div className="absolute -left-40 top-20 -z-10 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />

                <div className="absolute right-0 top-20 -z-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-24 lg:px-8 lg:py-28">
                    <div className="w-full max-w-3xl">
                        <div className="flex flex-col items-start gap-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/95 p-3 shadow-2xl backdrop-blur-md sm:h-24 sm:w-24">
                                    <Image
                                        src="/minsante_logo.png"
                                        alt="Ministry of Public Health Cameroon"
                                        width={100}
                                        height={100}
                                        priority
                                        className="h-full w-full object-contain"
                                    />
                                </div>

                                <div className="hidden h-12 w-px bg-white/30 sm:block" />

                                <div className="hidden sm:block">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                                        Republic of Cameroon
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-white">
                                        Ministry of Public Health
                                    </p>
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/50 px-4 py-2 text-sm font-semibold text-emerald-300 shadow-lg backdrop-blur-md">
                                <ShieldCheck className="h-4 w-4" />
                                <span>CNERSH • Legal &amp; Privacy</span>
                            </div>
                        </div>

                        <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Privacy Notice{" "}
                            <span className="text-emerald-400">
                                &amp; Terms of Use
                            </span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                            Information about responsible use of the CNERSH
                            website, protection of information and the
                            distinction between website services and formal
                            research ethics requirements.
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <a
                                href="#privacy-notice"
                                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400"
                            >
                                Read Privacy Notice

                                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                            </a>

                            <a
                                href="#terms-of-use"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15"
                            >
                                <FileText className="h-4 w-4" />
                                Terms of Use
                            </a>
                        </div>

                        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-6 text-sm text-slate-300">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                <span>Responsible information use</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-emerald-400" />
                                <span>Information protection</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-emerald-400" />
                                <span>Research governance</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Important notice */}
            <section className="border-b border-slate-200 bg-emerald-50 px-4 py-8 dark:border-slate-800 dark:bg-emerald-950/20 lg:px-8">
                <div className="mx-auto flex max-w-7xl gap-4">
                    <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-emerald-700 dark:text-emerald-400" />

                    <div>
                        <h2 className="font-bold text-slate-950 dark:text-white">
                            Important notice
                        </h2>

                        <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-700 dark:text-slate-300">
                            This page provides general website information. It
                            does not replace applicable Cameroon laws,
                            regulations, official CNERSH instruments, approved
                            research protocols, ethics committee decisions or
                            other authoritative requirements.
                        </p>
                    </div>
                </div>
            </section>

            {/* Privacy notice */}
            <section
                id="privacy-notice"
                className="scroll-mt-20 px-6 py-20 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                            Privacy notice
                        </p>

                        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                            How information should be handled
                        </h2>

                        <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                            Protecting information is an important part of
                            responsible public digital service and research
                            governance. The principles below describe the
                            approach to information handled through the
                            website.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 md:grid-cols-2">
                        {privacySections.map((section) => {
                            const Icon = section.icon;

                            return (
                                <article
                                    id={section.id}
                                    key={section.id}
                                    className="group scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-transform duration-300 group-hover:scale-105 dark:bg-emerald-950 dark:text-emerald-400">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    <h3 className="mt-6 text-xl font-bold">
                                        {section.title}
                                    </h3>

                                    <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                                        {section.content}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Information principles */}
            <section className="bg-slate-50 px-6 py-20 dark:bg-slate-900/60 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                            Information principles
                        </p>

                        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                            Core principles for responsible information
                            handling
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            [
                                "Purpose",
                                "Information should be collected and used for legitimate, clearly understood purposes.",
                            ],
                            [
                                "Minimization",
                                "Only information necessary for the relevant purpose should be requested or retained.",
                            ],
                            [
                                "Confidentiality",
                                "Information should be protected against inappropriate access or disclosure.",
                            ],
                            [
                                "Accountability",
                                "Information handling should remain subject to appropriate governance and oversight.",
                            ],
                        ].map(([title, description]) => (
                            <article
                                key={title}
                                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    {title.charAt(0)}
                                </div>

                                <h3 className="mt-5 font-bold text-emerald-700 dark:text-emerald-400">
                                    {title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                    {description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Terms */}
            <section
                id="terms-of-use"
                className="scroll-mt-20 px-6 py-20 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                                Terms of use
                            </p>

                            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                                Using the platform responsibly
                            </h2>

                            <p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">
                                Access to CNERSH information and digital
                                services should be accompanied by responsible
                                use, respect for applicable requirements and
                                protection of other people&apos;s information.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {terms.map((term) => (
                                <article
                                    key={term.title}
                                    className="group rounded-3xl border border-slate-200 p-7 transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-sm dark:border-slate-800 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/10"
                                >
                                    <div className="flex gap-4">
                                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                                        <div>
                                            <h3 className="font-bold">
                                                {term.title}
                                            </h3>

                                            <p className="mt-2 leading-7 text-slate-600 dark:text-slate-400">
                                                {term.text}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Research data */}
            <section className="relative overflow-hidden bg-slate-950 px-6 py-20 text-white lg:px-8">
                <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-2">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                                Research data
                            </p>

                            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                                Website privacy is not a substitute for
                                research data governance
                            </h2>
                        </div>

                        <div className="space-y-5 text-slate-300">
                            <p className="leading-8">
                                Research teams remain responsible for ensuring
                                that participant information, biological
                                materials and research records are handled
                                according to the approved study procedures and
                                applicable requirements.
                            </p>

                            <p className="leading-8">
                                Where a study involves sensitive personal
                                information, investigators should establish
                                appropriate safeguards for collection, access,
                                storage, transfer, retention and dissemination.
                            </p>

                            <p className="leading-8">
                                The CNERSH website should not be treated as
                                authorization to collect or process
                                participant data for a research study.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Updates */}
            <section className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-12">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            <FileText className="h-6 w-6" />
                        </div>

                        <h2 className="mt-6 text-2xl font-bold">
                            Updates to this page
                        </h2>

                        <p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">
                            Privacy and terms information may be updated when
                            website services, operational practices, applicable
                            requirements or official guidance changes. Users
                            should consult the latest published version when
                            relying on this information.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link
                                href="/pages/support"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
                            >
                                Contact support
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link
                                href="/pages/about"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                Learn about CNERSH
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}