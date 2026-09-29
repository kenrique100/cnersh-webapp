import Link from "next/link";
import {
    ArrowLeftIcon,
    Building2,
    Compass,
    Target,
    Heart,
    Scale,
    ShieldCheck,
    Award,
    Ban,
    Lock,
    UserCheck,
    Users,
    Gavel,
    ScrollText,
    Landmark,
    ExternalLink,
    FileSearch,
    FlaskConical,
    Baby,
    ClipboardList,
    FileCheck2,
    FileText,
    AlertTriangle,
    GraduationCap,
    Activity,
    Sparkles,
    CheckCircle2,
    BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* Data — mirrors the source document, kept next to the view           */
/* ------------------------------------------------------------------ */

interface IconItem {
    name: string;
    meaning: string;
    icon: React.ComponentType<{ className?: string }>;
}

const CORE_VALUES: IconItem[] = [
    {
        name: "Respect for Human Dignity",
        meaning: "Every research participant is treated as a person with inherent dignity and rights.",
        icon: Heart,
    },
    {
        name: "Beneficence",
        meaning: "Research should seek meaningful benefits for participants and society.",
        icon: Sparkles,
    },
    {
        name: "Non-Maleficence",
        meaning: "Risks and potential harms must be minimized and justified.",
        icon: ShieldCheck,
    },
    {
        name: "Justice & Equity",
        meaning: "Benefits and burdens of research should be distributed fairly.",
        icon: Scale,
    },
    {
        name: "Integrity",
        meaning: "Decisions and research processes must be honest, transparent and scientifically credible.",
        icon: Award,
    },
    {
        name: "Independence",
        meaning: "Ethical decisions are protected from inappropriate scientific, institutional, financial or political influence.",
        icon: Ban,
    },
    {
        name: "Confidentiality",
        meaning: "Participants' personal, health and research information is appropriately protected.",
        icon: Lock,
    },
    {
        name: "Accountability",
        meaning: "Researchers, sponsors, institutions and ethics committees must be answerable for their responsibilities.",
        icon: UserCheck,
    },
];

interface FunctionBlock {
    key: string;
    title: string;
    summary: string;
    points: string[];
    icon: React.ComponentType<{ className?: string }>;
}

const FUNCTIONS: FunctionBlock[] = [
    {
        key: "A",
        title: "Ethical Review",
        summary:
            "Review research protocols involving human participants and determine whether they satisfy ethical requirements.",
        points: [],
        icon: FileSearch,
    },
    {
        key: "B",
        title: "Scientific-Ethical Assessment",
        summary:
            "A study that cannot answer its research question exposes participants to risk without sufficient value. Scientific validity is a core part of ethical review.",
        points: [],
        icon: FlaskConical,
    },
    {
        key: "C",
        title: "Participant Protection",
        summary: "Particular attention is given to populations whose circumstances require additional safeguards:",
        points: [
            "Children",
            "Persons lacking decision-making capacity",
            "Pregnant women, where relevant",
            "Prisoners or institutionalized persons",
            "Economically or socially vulnerable populations",
            "Communities with limited access to healthcare",
            "Participants in emergency situations",
        ],
        icon: Baby,
    },
    {
        key: "D",
        title: "Informed Consent",
        summary:
            "Participants must receive appropriate information — purpose, procedures, risks, benefits, alternatives, confidentiality, voluntary participation and the right to withdraw. The 2022 law establishes criminal consequences for research conducted without the required information and consent.",
        points: [],
        icon: FileCheck2,
    },
    {
        key: "E",
        title: "Continuing Oversight",
        summary:
            "Ethical approval is not the end of ethical responsibility. Oversight covers the full lifecycle of the study.",
        points: [
            "Amendments",
            "Serious adverse events",
            "Protocol deviations",
            "Annual / continuing reports",
            "Safety reports",
            "Premature termination",
            "Final reports",
            "Complaints from participants",
            "Site monitoring",
        ],
        icon: ClipboardList,
    },
    {
        key: "F",
        title: "Ethics Education",
        summary: "The Committee promotes the education and continuous formation of the research community.",
        points: [
            "Research ethics training",
            "Good Clinical Practice",
            "Responsible conduct of research",
            "Bioethics",
            "Data protection",
            "Community engagement",
            "Ethical issues in emerging technologies and AI",
        ],
        icon: GraduationCap,
    },
];

interface Policy {
    n: number;
    title: string;
    body: string;
}

const POLICIES: Policy[] = [
    { n: 1, title: "No research without prior ethical clearance", body: "Research involving human participants must not commence without the required ethical clearance and applicable administrative research authorization. The 2022 law expressly establishes penalties for conducting research without these approvals." },
    { n: 2, title: "Approved protocol must be followed", body: "Once a protocol is approved, the investigator must conduct the research according to the approved protocol. Substantive changes must be reviewed before implementation, except where an immediate change is necessary to eliminate an urgent hazard to participants." },
    { n: 3, title: "Informed consent is mandatory", body: "No participant is enrolled without the legally and ethically required consent process. For minors or persons lacking capacity, the additional requirements applicable to their circumstances must be followed." },
    { n: 4, title: "Risk must be proportionate", body: "Research risks must be identified, minimized as much as possible, justified and monitored, and managed." },
    { n: 5, title: "Vulnerable participants require additional safeguards", body: "The presence of a vulnerable population triggers enhanced ethical scrutiny." },
    { n: 6, title: "Privacy and confidentiality", body: "Researchers must protect identifiable information, medical records, biological specimens, genomic information, digital research data, audio/video recordings, and community-level sensitive information." },
    { n: 7, title: "Biological materials", body: "Collection, storage, transportation, secondary use and transfer of biological materials must comply with applicable requirements." },
    { n: 8, title: "Data governance", body: "Research data must have defined policies covering collection, ownership, access, storage, sharing, transfer, retention, destruction and secondary use." },
    { n: 9, title: "Protocol amendments", body: "Material changes — objectives, methodology, sample size, eligibility, interventions, consent procedures, sites, investigators or data management — must receive appropriate review before implementation." },
    { n: 10, title: "Adverse events and safety reporting", body: "Investigators must promptly report serious or unexpected events according to the applicable protocol, SOPs and regulatory requirements." },
    { n: 11, title: "Conflict of interest", body: "Committee members and investigators must disclose relevant conflicts of interest and must not participate in decisions where their independence could reasonably be questioned." },
    { n: 12, title: "Publication integrity", body: "Research must not be suppressed, manipulated or selectively reported because the results are inconvenient." },
];

interface ReviewCategory {
    key: string;
    title: string;
    body: string;
    icon: React.ComponentType<{ className?: string }>;
}

const REVIEW_CATEGORIES: ReviewCategory[] = [
    {
        key: "A",
        title: "Full Committee / Amendment Review",
        body: "For research involving greater-than-minimal risk, clinical interventions, vulnerable populations or significant ethical complexity — and for modifications to previously approved research.",
        icon: Users,
    },
    {
        key: "B",
        title: "Expedited Review",
        body: "For defined categories of lower-risk research or qualifying amendments, according to approved SOPs, or when requested by the researcher to meet funding deadlines.",
        icon: Activity,
    },
    {
        key: "C",
        title: "Continuing and Safety / Incident Review",
        body: "For studies requiring continuing ethical oversight, and for serious adverse events, protocol violations, complaints, or other circumstances requiring urgent consideration.",
        icon: AlertTriangle,
    },
    {
        key: "D",
        title: "Appropriate Committee Deference Review",
        body: "CNERSH reviews all protocols of international funding, all protocols that involve two or more regions, all clinical trials, and all invasive protocols also requiring the use of new medical devices. Single-institution protocols are referred to the institution's IRB; biotechnology and animal-ethics protocols are referred to the BTC Joint IRB; protocols within one region are referred to the CRERSH.",
        icon: Landmark,
    },
];

const SCIENTIFIC_CHECKLIST = [
    "Study title",
    "Principal investigator and co-investigators",
    "Sponsor / promoter",
    "Abstract in French and English",
    "Introduction",
    "Research question",
    "Hypotheses",
    "Objectives",
    "Literature review",
    "Study design",
    "Study sites",
    "Study period",
    "Study population",
    "Inclusion / exclusion criteria",
    "Recruitment strategy",
    "Sample size and justification",
    "Sample-collection procedures",
];

const ETHICS_CHECKLIST = [
    "Ethics-clearance request",
    "Participant information sheet",
    "Informed-consent forms",
    "Assent forms, where applicable",
    "Data-collection instruments",
    "Investigator CVs",
    "Budget",
    "Funding letter and arrangements",
    "Conflict-of-interest declarations",
    "Insurance, where applicable (clinical trials)",
    "Data-management plan (Data Sharing Agreement)",
    "Biological-material management plan (Material Transfer Agreement)",
    "Community-engagement plan and results dissemination",
    "Risk-management plan",
    "Compensation / reimbursement arrangements",
    "Investigator's Brochure for new machines and interventions",
    "Recruitment materials",
    "Investigator training / GCP documentation, where applicable",
];

const QUICK_FACTS = [
    { label: "Coordination body", value: "20 members", icon: Users },
    { label: "Legal framework", value: "Law No. 2022/008", icon: Gavel },
    { label: "Clearance validity", value: "1 year, renewable", icon: ScrollText },
    { label: "Scope", value: "National", icon: Landmark },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function SectionHeading({
                            icon: Icon,
                            eyebrow,
                            title,
                            description,
                        }: {
    icon: React.ComponentType<{ className?: string }>;
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <Icon className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    {eyebrow}
                </p>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-100">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function AboutPage() {
    const session = await authSession();

    let navUser = null;
    let notificationCount = 0;

    if (session) {
        try {
            const [user, unreadCount] = await Promise.all([
                db.user.findUnique({
                    where: { id: session.user.id },
                    select: { name: true, email: true, image: true, gender: true, role: true },
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
        } catch (error) {
            console.error("Error fetching user data for about page:", error);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-sm">
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">About Us</span>
                </div>

                {/* Hero */}
                <section className="relative mb-8 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 px-6 py-10 sm:px-10 sm:py-14 dark:border-blue-900/60 dark:from-blue-950/40 dark:via-gray-950 dark:to-violet-950/30">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/30" />
                    <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/30" />
                    <div className="relative">
                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            <Landmark className="h-3.5 w-3.5" />
                            Governed by Law No. 2022/008
                        </span>
                        <h1 className="mt-4 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
                            <Building2 className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                            About CNERSH
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base dark:text-gray-400">
                            The National Ethics Committee for Health Research on Humans is Cameroon&apos;s
                            national ethical oversight and coordination body for research involving human
                            participants.
                        </p>
                    </div>
                </section>

                {/* Quick facts */}
                <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {QUICK_FACTS.map((fact) => {
                        const Icon = fact.icon;
                        return (
                            <Card
                                key={fact.label}
                                className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                            >
                                <CardContent className="flex flex-col gap-1 p-4">
                                    <Icon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{fact.label}</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {fact.value}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </section>

                {/* Table of contents */}
                <Card className="mb-10 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <CardContent className="p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            On this page
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                            {[
                                ["#who-we-are", "Who We Are"],
                                ["#vision-mission", "Vision & Mission"],
                                ["#values", "Core Values"],
                                ["#functions", "Important Functions"],
                                ["#policies", "Protocol Policies"],
                                ["#categories", "Review Categories"],
                                ["#processes", "Scientific & Ethical Processes"],
                                ["#penalties", "Penalties"],
                                ["#legal", "Legal Foundation"],
                            ].map(([href, label]) => (
                                <a
                                    key={href}
                                    href={href}
                                    className="truncate text-gray-600 underline-offset-2 hover:text-blue-700 hover:underline dark:text-gray-400 dark:hover:text-blue-400"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 1 — Who we are */}
                <section id="who-we-are" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={Building2}
                        eyebrow="Section 01"
                        title="Who We Are"
                    />
                    <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            <p>
                                The National Ethics Committee for Research for Human Health —{" "}
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    CNERSH
                                </span>{" "}
                                (its French acronym) — is Cameroon&apos;s national ethical oversight and
                                coordination body for research involving human participants in the health
                                domain. Its fundamental responsibility is to ensure that research is
                                scientifically sound, ethically acceptable, respectful of human dignity,
                                protective of participants&apos; rights, safety and welfare, conducted
                                according to an approved protocol, and compliant with Cameroon&apos;s laws
                                and regulations.
                            </p>
                            <p>
                                The national committee also has a{" "}
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    20-person coordination and supervisory function
                                </span>{" "}
                                over research ethics committees operating within health structures and
                                higher institutions of education. Its historical mandate includes
                                developing standard operating procedures, reviewing multi-regional
                                research, and monitoring compliance with ethical principles.
                            </p>
                            <p>
                                The current legal foundation was laid down by{" "}
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    Law No. 2022/008
                                </span>
                                , which applies to medical research involving human beings and
                                establishes requirements concerning participants, investigators,
                                sponsors, biological materials, health data and clinical trials.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {/* 2 — Vision & Mission */}
                <section id="vision-mission" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={Target}
                        eyebrow="Section 02"
                        title="Vision & Mission"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="rounded-xl border border-violet-200 bg-violet-50/60 dark:border-violet-900/60 dark:bg-violet-950/30">
                            <CardContent className="p-6">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
                                        <Target className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                                    </div>
                                    <h3 className="text-base font-semibold text-violet-900 dark:text-violet-100">
                                        Our Vision
                                    </h3>
                                </div>
                                <p className="text-sm leading-relaxed text-violet-900/90 dark:text-violet-100/80">
                                    To be a trusted national leader in ethical research governance,
                                    ensuring that research involving human beings in Cameroon advances
                                    knowledge and health while protecting human dignity, rights, safety
                                    and wellbeing.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/30">
                            <CardContent className="p-6">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                        <Compass className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                                    </div>
                                    <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
                                        Our Mission
                                    </h3>
                                </div>
                                <ul className="space-y-2 text-sm leading-relaxed text-blue-900/90 dark:text-blue-100/80">
                                    <li className="flex gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                                        Protect the rights, dignity, safety and wellbeing of persons
                                        involved in research.
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                                        Promote scientifically rigorous and ethically responsible
                                        research.
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                                        Coordinate and strengthen the national research ethics system,
                                        and ensure compliance with Cameroon&apos;s ethical and regulatory
                                        requirements.
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 3 — Core values */}
                <section id="values" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={Heart}
                        eyebrow="Section 03"
                        title="Our Core Values"
                        description="Eight values underpin every decision made by the Committee."
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {CORE_VALUES.map((value) => {
                            const Icon = value.icon;
                            return (
                                <Card
                                    key={value.name}
                                    className="rounded-xl border border-gray-200 bg-white transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-900"
                                >
                                    <CardContent className="flex gap-3 p-4">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                                            <Icon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {value.name}
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                                {value.meaning}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* 4 — Important functions */}
                <section id="functions" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={BookOpen}
                        eyebrow="Section 04"
                        title="Important Functions"
                        description="The Committee's institutional functions span the whole lifecycle of a research study."
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        {FUNCTIONS.map((fn) => {
                            const Icon = fn.icon;
                            return (
                                <Card
                                    key={fn.key}
                                    className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                                >
                                    <CardContent className="p-5">
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                                                <Icon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                    Function {fn.key}
                                                </p>
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {fn.title}
                                                </h3>
                                            </div>
                                        </div>
                                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                            {fn.summary}
                                        </p>
                                        {fn.points.length > 0 && (
                                            <ul className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-500 sm:grid-cols-2 dark:text-gray-400">
                                                {fn.points.map((p) => (
                                                    <li key={p} className="flex items-start gap-1.5">
                                                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                                                        {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* 5 — Protocol policies */}
                <section id="policies" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={ScrollText}
                        eyebrow="Section 05"
                        title="Protocol Policies"
                        description="Twelve governance policies the Committee maintains across all research it oversees."
                    />
                    <div className="space-y-3">
                        {POLICIES.map((policy) => (
                            <div
                                key={policy.n}
                                className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white dark:bg-blue-600">
                                    {policy.n.toString().padStart(2, "0")}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {policy.title}
                                    </p>
                                    <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                        {policy.body}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 6 — Review categories */}
                <section id="categories" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={FileText}
                        eyebrow="Section 06"
                        title="Review Categories"
                        description="Submissions are operationally classified into four review paths."
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                        {REVIEW_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <Card
                                    key={cat.key}
                                    className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                                >
                                    <CardContent className="p-5">
                                        <div className="mb-2 flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950">
                                                <Icon className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                                                Category {cat.key}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {cat.title}
                                        </h3>
                                        <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                                            {cat.body}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                        <p className="font-semibold">Important reminders</p>
                        <ul className="mt-1 space-y-1">
                            <li>• All ethical clearances cover a one-year period and must be renewed.</li>
                            <li>
                                • All protocols must obtain national or regional authorisation, as
                                applicable, before the start of activities.
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 7 — Scientific & ethical processes */}
                <section id="processes" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={FileCheck2}
                        eyebrow="Section 07"
                        title="Scientific & Ethical Processes"
                        description="The checklists CNERSH uses when validating a submission."
                    />
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Scientific Checklist
                                    </h3>
                                </div>
                                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                    {SCIENTIFIC_CHECKLIST.map((item) => (
                                        <li key={item} className="flex items-start gap-2">
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Ethics Checklist
                                    </h3>
                                </div>
                                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                    {ETHICS_CHECKLIST.map((item) => (
                                        <li key={item} className="flex items-start gap-2">
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 8 — Penalties */}
                <section id="penalties" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={Gavel}
                        eyebrow="Section 08"
                        title="Penalties under the 2022 Law"
                        description="Law No. 2022/008, Chapter VII, Articles 56–60, establishes the sanctions below."
                    />

                    {/* Administrative */}
                    <Card className="mb-4 rounded-xl border border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30">
                        <CardContent className="p-6">
                            <div className="mb-3 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-400" />
                                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                                    Administrative sanctions (Article 56)
                                </h3>
                            </div>
                            <ul className="grid grid-cols-1 gap-1.5 text-xs text-red-900/90 sm:grid-cols-2 dark:text-red-100/80">
                                {[
                                    "Suspension or withdrawal of ethical clearance",
                                    "Suspension or withdrawal of administrative research authorization",
                                    "Confiscation or destruction of biomedical material and data at the offender's expense",
                                    "Suspension of eligibility to receive research funding",
                                    "Suspension of authorization to conduct experimental interventions",
                                    "Suspension of authorization to practise medicine or another connected profession",
                                    "Temporary or permanent closure of the research institution",
                                    "Prohibition of publication of results from the offending research",
                                    "Prohibition of placing products from improperly conducted experimental research on the national market",
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-600 dark:bg-red-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Financial + criminal */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Card className="rounded-xl border border-red-200 bg-white dark:border-red-900/60 dark:bg-gray-950">
                            <CardContent className="p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                                    Financial
                                </p>
                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Research without clearance or authorization
                                </p>
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                    FCFA 1,000,000 — FCFA 100,000,000. The same range applies to
                                    investigators who deviate from an approved protocol, knowingly
                                    enrol someone already participating in another clinical trial, or
                                    continue research that has been prohibited or suspended.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border border-red-200 bg-white dark:border-red-900/60 dark:bg-gray-950">
                            <CardContent className="p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                                    Financial
                                </p>
                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Lack of insurance
                                </p>
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                    A promoter initiating medical research without the required
                                    insurance covering potential research-related risks may face a
                                    fine of FCFA 50,000,000 — FCFA 200,000,000.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border border-red-300 bg-red-100/60 sm:col-span-2 dark:border-red-800 dark:bg-red-950/50">
                            <CardContent className="p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-300">
                                    Criminal (Article 59)
                                </p>
                                <p className="mt-2 text-sm font-semibold text-red-900 dark:text-red-100">
                                    Imprisonment of 1 to 5 years and a fine of FCFA 10,000,000 —
                                    FCFA 50,000,000
                                </p>
                                <p className="mt-1 text-sm text-red-900/90 dark:text-red-100/80">
                                    Applies to specified violations including failure to inform
                                    participants of their rights, procedures and risks; conducting
                                    research without required consent; research involving minors or
                                    adults lacking capacity without the required assent / consent
                                    arrangements; or continuing research after consent has been
                                    withdrawn.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 9 — Legal foundation */}
                <section id="legal" className="mb-12 scroll-mt-24">
                    <SectionHeading
                        icon={Landmark}
                        eyebrow="Section 09"
                        title="Legal Foundation"
                    />
                    <Card className="rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Law No. 2022/008 of 27 April 2022
                            </p>
                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                Relating to medical research involving the human person in Cameroon,
                                published by the Presidency of the Republic of Cameroon.
                            </p>
                            <a
                                href="https://prc.cm/fr/actualites/actes/lois/5773-loi-n-2022-008-du-27-avril-2022-relative-a-la-recherche-medicale-impliquant-la-personne-humaine-au-cameroun"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                            >
                                Read the law on the Presidency of the Republic&apos;s site
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>

                            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    Important distinction
                                </p>
                                <p className="mt-1">
                                    The 2022 law is the key legal framework for obligations and
                                    sanctions. The CNERSH&apos;s precise current organisational
                                    structure, membership, SOPs, fees and operational procedures
                                    are taken from the latest MINSANTE instruments and CNERSH SOPs,
                                    which also establish much of the ethics-committee architecture
                                    and procedures.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Closing line */}
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-5 text-center dark:border-blue-900 dark:bg-blue-950/40">
                    <p className="mx-auto max-w-3xl text-sm italic leading-relaxed text-blue-900 dark:text-blue-100">
                        &ldquo;Ethical clearance is not a certificate to conduct research; it is the
                        beginning of an accountability relationship between the researcher, the
                        participant, the institution, the regulator and society.&rdquo;
                    </p>
                </div>

                <div className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
                    CNERSH © {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}