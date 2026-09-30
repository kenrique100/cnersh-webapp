"use client";

import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    FileCheck2,
    Gavel,
    HeartHandshake,
    Landmark,
    LockKeyhole,
    Scale,
    ShieldCheck,
    Users,
    Waypoints,
} from "lucide-react";

const values = [
    {
        title: "Respect for Human Dignity",
        description:
            "Every participant is treated as a person with inherent dignity and rights.",
        icon: HeartHandshake,
    },
    {
        title: "Beneficence",
        description:
            "Research should seek meaningful benefits for participants and society.",
        icon: HeartHandshake,
    },
    {
        title: "Non-Maleficence",
        description:
            "Risks and potential harms must be minimized and appropriately justified.",
        icon: ShieldCheck,
    },
    {
        title: "Justice & Equity",
        description:
            "The benefits and burdens of research should be distributed fairly.",
        icon: Scale,
    },
    {
        title: "Integrity",
        description:
            "Decisions and processes must be honest, transparent and scientifically credible.",
        icon: CheckCircle2,
    },
    {
        title: "Independence",
        description:
            "Ethical decisions should be protected from inappropriate scientific, institutional, financial or political influence.",
        icon: Landmark,
    },
    {
        title: "Confidentiality",
        description:
            "Personal, health and research information must be appropriately protected.",
        icon: LockKeyhole,
    },
    {
        title: "Accountability",
        description:
            "Researchers, sponsors, institutions and committees must be answerable for their responsibilities.",
        icon: Gavel,
    },
];

const functions = [
    {
        title: "Ethical Review",
        description:
            "Review research protocols involving human participants and determine whether they satisfy applicable ethical requirements.",
        icon: FileCheck2,
    },
    {
        title: "Scientific-Ethical Assessment",
        description:
            "Scientific validity is an ethical component because a study unable to answer its research question may expose participants to risk without sufficient scientific or social value.",
        icon: BookOpen,
    },
    {
        title: "Participant Protection",
        description:
            "Particular attention is given to children, people lacking decision-making capacity, pregnant women where relevant, prisoners or institutionalized persons, vulnerable populations, communities with limited healthcare access and emergency participants.",
        icon: Users,
    },
    {
        title: "Informed Consent",
        description:
            "Participants should receive understandable information about purpose, procedures, risks, benefits, confidentiality, voluntariness and withdrawal.",
        icon: HeartHandshake,
    },
    {
        title: "Continuing Oversight",
        description:
            "Oversight includes amendments, serious adverse events, protocol deviations, continuing reports, safety reports, termination, final reports, complaints and monitoring.",
        icon: Waypoints,
    },
    {
        title: "Ethics Education",
        description:
            "CNERSH promotes research ethics, GCP, responsible conduct, bioethics, data protection, community engagement and ethical consideration of emerging technologies.",
        icon: ShieldCheck,
    },
];

const policies = [
    {
        number: "01",
        title: "No research without prior ethical clearance",
        description:
            "Research involving human participants should not commence without the required ethical clearance and applicable administrative authorization.",
    },
    {
        number: "02",
        title: "Approved protocol must be followed",
        description:
            "Research should be conducted according to the approved protocol. Substantive changes should receive appropriate review before implementation except urgent participant-safety changes.",
    },
    {
        number: "03",
        title: "Informed consent is mandatory",
        description:
            "No participant should be enrolled without the legally and ethically required consent process.",
    },
    {
        number: "04",
        title: "Risk must be proportionate",
        description:
            "Risks should be identified, minimized, justified, monitored and appropriately managed.",
    },
    {
        number: "05",
        title: "Vulnerable participants require additional safeguards",
        description:
            "Vulnerability should trigger enhanced ethical scrutiny and appropriate safeguards.",
    },
    {
        number: "06",
        title: "Privacy and confidentiality",
        description:
            "Identifiable information, medical records, specimens, genomic information, digital data, recordings and sensitive community information require appropriate protection.",
    },
    {
        number: "07",
        title: "Biological materials",
        description:
            "Collection, storage, transportation, secondary use and transfer of biological materials must comply with applicable requirements.",
    },
    {
        number: "08",
        title: "Data governance",
        description:
            "Research data governance should define collection, responsibility, access, storage, sharing, transfer, retention, destruction and secondary use.",
    },
    {
        number: "09",
        title: "Protocol amendments",
        description:
            "Material changes to objectives, methods, sample, eligibility, intervention, consent, sites, investigators or data management should receive appropriate review.",
    },
    {
        number: "10",
        title: "Adverse events and safety reporting",
        description:
            "Serious or unexpected events should be reported according to applicable protocols, SOPs and regulatory requirements.",
    },
    {
        number: "11",
        title: "Conflict of interest",
        description:
            "Relevant conflicts should be disclosed and managed appropriately.",
    },
    {
        number: "12",
        title: "Publication integrity",
        description:
            "Research should not be suppressed, manipulated or selectively reported because findings are inconvenient.",
    },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
            {/* Hero */}
            <section className="relative isolate min-h-[650px] overflow-hidden bg-slate-950">
                <Image
                    src="/about-hero.png"
                    alt="Health research and ethical oversight"
                    fill
                    priority
                    className="object-cover object-center"
                />

                <div className="absolute inset-0 bg-slate-950/65" />

                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-blue-950/30" />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />

                <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
                    <div className="grid w-full gap-12 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200 backdrop-blur-md">
                                National Research Ethics Oversight
                            </div>

                            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                                National Ethics Committee for Research for Human Health
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                                CNERSH is Cameroon&apos;s national ethical oversight and
                                coordination body for research involving human participants
                                in the health domain.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href="#who-we-are"
                                    className="inline-flex items-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-600"
                                >
                                    Discover CNERSH
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </a>

                                <Link
                                    href="/pages/article"
                                    className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
                                >
                                    Knowledge Centre
                                    <BookOpen className="ml-2 h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="flex justify-start lg:justify-end">
                            <div className="relative w-full max-w-sm">
                                <div className="absolute -inset-6 rounded-[2rem] bg-blue-500/10 blur-3xl" />

                                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                                                Government Health Authority
                                            </p>

                                            <p className="mt-2 text-sm font-semibold text-white">
                                                Ministry of Public Health
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white p-3 shadow-lg">
                                            <Image
                                                src="/minsante_logo.png"
                                                alt="Ministry of Public Health Cameroon"
                                                width={90}
                                                height={90}
                                                className="h-16 w-16 object-contain"
                                            />
                                        </div>
                                    </div>

                                    <div className="my-6 h-px bg-white/20" />

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                                                <ShieldCheck className="h-4 w-4 text-blue-200" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-bold text-white">
                                                    Participant Protection
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-slate-300">
                                                    Protecting dignity, rights, safety and
                                                    wellbeing.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                                                <Scale className="h-4 w-4 text-blue-200" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-bold text-white">
                                                    Ethical Governance
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-slate-300">
                                                    Supporting responsible health research
                                                    in Cameroon.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-7 rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3">
                                        <p className="text-xs leading-5 text-slate-300">
                                            Ethical research oversight for a healthier and
                                            safer Cameroon.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950" />
            </section>

            {/* Who We Are */}
            <section
                id="who-we-are"
                className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
            >
                <div className="grid gap-8 lg:grid-cols-[1.3fr_.7fr]">
                    <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            01 · Who We Are
                        </p>

                        <h2 className="mt-2 text-3xl font-black">
                            A national system for ethical research oversight
                        </h2>

                        <p className="mt-5 leading-8 text-slate-600 dark:text-slate-400">
                            CNERSH&apos;s fundamental responsibility is to help ensure that
                            health research is scientifically sound, ethically acceptable,
                            respectful of human dignity, protective of participants&apos;
                            rights, safety and welfare, conducted according to an approved
                            protocol and compliant with Cameroon&apos;s laws and regulations.
                        </p>

                        <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">
                            The Committee has a coordination and supervisory function in
                            relation to research ethics committees operating within health
                            structures and higher institutions of education. Its mandate
                            includes strengthening research ethics systems, developing
                            procedures, reviewing relevant research and supporting
                            compliance monitoring.
                        </p>

                        <div className="mt-6 rounded-xl border-l-4 border-blue-800 bg-blue-50 p-5 text-sm leading-7 dark:bg-blue-950/30">
                            <b>Legal foundation:</b> The CNERSH source document identifies
                            Law No. 2022/008 as the key framework for medical research
                            involving human beings, including participants, investigators,
                            sponsors/promoters, biological materials, health data and
                            clinical research.
                        </div>
                    </article>

                    <aside className="rounded-2xl bg-blue-950 p-7 text-white">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
                            Our Mandate
                        </p>

                        <div className="mt-6 space-y-5">
                            {[
                                "Scientific validity",
                                "Ethical acceptability",
                                "Participant protection",
                                "Protocol compliance",
                                "Regulatory compliance",
                            ].map((item) => (
                                <div key={item} className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-300" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </section>

            {/* Vision and Mission */}
            <section className="border-y bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            02 · Our Vision
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Trusted national leadership
                        </h2>

                        <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">
                            To be a trusted national leader in ethical research governance,
                            ensuring that research involving human beings in Cameroon
                            advances knowledge and health while protecting human dignity,
                            rights, safety and wellbeing.
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            03 · Our Mission
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Protect · Promote · Coordinate · Comply
                        </h2>

                        <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">
                            Protect rights, dignity, safety and wellbeing; promote
                            scientifically rigorous and ethically responsible research;
                            coordinate and strengthen the national research ethics system;
                            and support compliance with Cameroon&apos;s ethical and
                            regulatory requirements.
                        </p>
                    </article>
                </div>
            </section>

            {/* Core Values */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                    04 · Core Values
                </p>

                <h2 className="mt-2 text-3xl font-black">
                    Principles that guide ethical oversight
                </h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {values.map((value) => {
                        const Icon = value.icon;

                        return (
                            <article
                                key={value.title}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                            >
                                <Icon className="h-6 w-6 text-blue-800" />

                                <h3 className="mt-4 font-bold">{value.title}</h3>

                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    {value.description}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* Functions */}
            <section className="bg-slate-100 dark:bg-slate-900/60">
                <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                        05 · Important Functions
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                        How ethical oversight works
                    </h2>

                    <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {functions.map((item) => {
                            const Icon = item.icon;

                            return (
                                <article
                                    key={item.title}
                                    className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
                                >
                                    <Icon className="h-6 w-6 text-blue-800" />

                                    <h3 className="mt-5 font-bold">{item.title}</h3>

                                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
                                        {item.description}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Policies */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            06 · Protocol Policies
                        </p>

                        <h2 className="mt-2 text-3xl font-black">
                            The 12-policy governance framework
                        </h2>
                    </div>

                    <Link
                        href="/pages/article#protocol-policies"
                        className="font-bold text-blue-800 hover:underline"
                    >
                        Expanded guidance
                        <ArrowRight className="ml-1 inline h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                    {policies.map((policy) => (
                        <article
                            key={policy.number}
                            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex gap-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">
                                    {policy.number}
                                </span>

                                <div>
                                    <h3 className="font-bold">{policy.title}</h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        {policy.description}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* Governance Areas */}
            <section className="border-y bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
                    <article className="rounded-2xl border border-slate-200 p-7 dark:border-slate-800">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            07 · Review Categories
                        </p>

                        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">
                            CNERSH&apos;s governance framework includes appropriate pathways
                            for full review, amendments, expedited review and continuing,
                            safety or incident-related oversight.
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 p-7 dark:border-slate-800">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            08 · Scientific &amp; Ethical Processes
                        </p>

                        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">
                            Review considers scientific protocol elements together with
                            information and consent, data management, biological materials,
                            community engagement, risk, funding, compensation and
                            investigator training.
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 p-7 dark:border-slate-800">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            09 · Accountability
                        </p>

                        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">
                            Ethical clearance is the beginning of an accountability
                            relationship among researchers, participants, institutions,
                            regulators and society.
                        </p>
                    </article>
                </div>
            </section>

            {/* Accountability */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                            10 · Accountability
                        </p>

                        <h2 className="mt-2 text-3xl font-black">
                            Accountability under Law No. 2022/008
                        </h2>

                        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">
                            The CNERSH source describes administrative, financial and
                            criminal sanctions under Chapter VII, Articles 56–60. The
                            official law should be consulted for legal reliance.
                        </p>

                        <Link
                            href="/pages/article#penalties"
                            className="mt-5 inline-block font-bold text-blue-800 hover:underline"
                        >
                            View documented framework →
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <Image
                            src="/article.png"
                            alt="CNERSH research ethics resources"
                            width={1200}
                            height={700}
                            className="h-64 w-full object-cover"
                        />

                        <div className="p-6">
                            <p className="font-bold">
                                Ethical clearance is not a certificate to conduct research;
                                it begins continuing accountability.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/logo.png"
                            alt="CNERSH logo"
                            width={52}
                            height={52}
                            className="rounded-md bg-white object-contain"
                        />

                        <span>
                            <b className="block">CNERSH</b>

                            <span className="text-xs text-slate-400">
                                National Ethics Committee for Health Research on Humans
                            </span>
                        </span>
                    </Link>

                    <nav className="mt-6 flex flex-wrap gap-5 text-sm text-slate-300">
                        <Link
                            href="/pages/article"
                            className="hover:text-white hover:underline"
                        >
                            Articles
                        </Link>

                        <Link
                            href="/pages/accessibility"
                            className="hover:text-white hover:underline"
                        >
                            Accessibility
                        </Link>

                        <Link
                            href="/pages/privacy-terms"
                            className="hover:text-white hover:underline"
                        >
                            Privacy &amp; Terms
                        </Link>

                        <Link
                            href="/pages/support"
                            className="hover:text-white hover:underline"
                        >
                            Support
                        </Link>
                    </nav>

                    <p className="mt-6 text-xs text-slate-500">
                        © {new Date().getFullYear()} CNERSH · Cameroon
                    </p>
                </div>
            </footer>
        </div>
    );
}