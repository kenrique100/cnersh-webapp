// Route: /pages — This is an App Router URL segment, NOT the Next.js Pages Router.
// The `pages/` directory here is intentional and acts as a /pages/* route group.
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, ExternalLinkIcon, DownloadIcon, ChevronRightIcon, ArrowLeftIcon, BuildingIcon, UsersIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

interface PageItem {
    id: string;
    name: string;
    url: string | null;
    fileUrl: string | null;
}

interface Page {
    id: string;
    name: string;
    items: PageItem[];
    children: Page[];
    createdAt: Date;
    updatedAt: Date;
}

function PageSection({ page, depth = 0 }: { page: Page; depth?: number }) {
    return (
        <Card className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl ${depth > 0 ? "border-l-4 border-l-purple-300 dark:border-l-purple-700" : ""}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                    <span className="break-words">{page.name}</span>
                    {depth > 0 && (
                        <span className="text-xs text-gray-400 font-normal">(sub-page)</span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {page.items.length > 0 && (
                    <ul className="space-y-2">
                        {page.items.map((item) => {
                            const href = item.url || item.fileUrl;
                            const isFile = !item.url && !!item.fileUrl;

                            if (!href) {
                                return (
                                    <li key={item.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                                        <FileTextIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="text-base text-gray-700 dark:text-gray-300 break-words">{item.name}</span>
                                    </li>
                                );
                            }

                            return (
                                <li key={item.id}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        {isFile ? (
                                            <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        ) : (
                                            <ExternalLinkIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                        )}
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            {item.name}
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {page.children && page.children.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {page.children.map((child) => (
                            <PageSection key={child.id} page={child} depth={depth + 1} />
                        ))}
                    </div>
                )}

                {page.items.length === 0 && (!page.children || page.children.length === 0) && (
                    <p className="text-base text-gray-500 dark:text-gray-400 py-2">No content available yet.</p>
                )}
            </CardContent>
        </Card>
    );
}

export default async function OurPagesPage() {
    const session = await authSession();

    let navUser = null;
    let notificationCount = 0;

    if (session) {
        const [user, unreadCount] = await Promise.all([
            db.user.findUnique({
                where: { id: session.user.id },
                select: { name: true, email: true, image: true, role: true },
            }),
            getUnreadNotificationCount(),
        ]);
        if (user) {
            navUser = { name: user.name, email: user.email, image: user.image, role: user.role };
        }
        notificationCount = unreadCount;
    }

    const pages = await db.page.findMany({
        where: { parentId: null },
        include: {
            items: { orderBy: { createdAt: "asc" } },
            children: {
                include: {
                    items: { orderBy: { createdAt: "asc" } },
                    children: {
                        include: {
                            items: { orderBy: { createdAt: "asc" } },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Navbar */}
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Home</span>
                    </Link>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900">
                        <FileTextIcon className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Our Pages
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Browse resources, documents, and information
                        </p>
                    </div>
                </div>

                {/* Pages List */}
                <div className="space-y-4">
                    {pages.map((page) => (
                        <PageSection key={page.id} page={page} />
                    ))}

                    {/* Static Ethical Clearance Page */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                <span className="break-words">Ethical Clearance</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="/PROCEDURE D'EVALUATION DES PROTOCOLES DE RECHERCHE.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            Documents &amp; Calendar
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                            </ul>

                            {/* Application Guidelines - sub-section */}
                            <div className="mt-4">
                                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl border-l-4 border-l-purple-300 dark:border-l-purple-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                            <span className="break-words">Application Guidelines</span>
                                            <span className="text-xs text-gray-400 font-normal">(sub-page)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ul className="space-y-2">
                                            <li>
                                                <a
                                                    href="/Composition dossier pour soumission protocole.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Dossier Composition
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                            <li>
                                                <a
                                                    href="/Form for Ethical Clearance CNERSH (2025).pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Clearance Form
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Forms & Questionnaires - sub-section */}
                            <div className="mt-4">
                                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl border-l-4 border-l-purple-300 dark:border-l-purple-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                            <span className="break-words">Forms &amp; Questionnaires</span>
                                            <span className="text-xs text-gray-400 font-normal">(sub-page)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ul className="space-y-2">
                                            <li>
                                                <a
                                                    href="/Contenu d'un protocole de recherche.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Protocol Content
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                            <li>
                                                <a
                                                    href="/Fiche d'Evaluation CNERSH.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Evaluation Form
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Static Resources Page */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                <span className="break-words">Resources</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="https://elearning.trree.org"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <ExternalLinkIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            WHO links for training
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/WEB-CIOMS-EthicalGuidelines.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            CIOMS
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/wma-declaration-of-helsinki (3).pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            Helsinki Declaration
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/The Tuskegee Syphilis Study.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            Tuskegee Syphilis Trials
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                            </ul>

                            {/* Law & Research in Cameroon - sub-section */}
                            <div className="mt-4">
                                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl border-l-4 border-l-purple-300 dark:border-l-purple-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                            <span className="break-words">Law &amp; Research in Cameroon</span>
                                            <span className="text-xs text-gray-400 font-normal">(sub-page)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ul className="space-y-2">
                                            <li>
                                                <a
                                                    href="/LAW ON RESEARCH ON HUMAN SUBJECTS.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Law on Human Subjects
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                            <li>
                                                <a
                                                    href="/LOI RECHERCHE MEDICALE-OCR.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Medical Research
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                            <li>
                                                <a
                                                    href="/Finance Law 2024.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Finance Law 2024
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                            <li>
                                                <a
                                                    href="/loi_n_2024_017_du_23_12_2024-web.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Data Protection Law
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Article link */}
                            <div className="mt-3">
                                <ul className="space-y-2">
                                    <li>
                                        <Link
                                            href="/pages/article"
                                            className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                        >
                                            <FileTextIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                            <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                Article
                                            </span>
                                            <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Ministerial Decision - sub-section */}
                            <div className="mt-4">
                                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl border-l-4 border-l-purple-300 dark:border-l-purple-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <FileTextIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                            <span className="break-words">Ministerial Decision</span>
                                            <span className="text-xs text-gray-400 font-normal">(sub-page)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ul className="space-y-2">
                                            <li>
                                                <a
                                                    href="/Organisation_et_fonctionnement__évaluation_recherche_12.11.2023-good version.pdf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                                >
                                                    <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                                        Ministerial Decision
                                                    </span>
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                </a>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Static Article Pages */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                <span className="break-words">About Us</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="/pages/about"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <FileTextIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            View About Us Page
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </Link>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <BuildingIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                <span className="break-words">Contract Rex Org</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="/pages/contract-rex"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <FileTextIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            View Contract Rex Organization Page
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </Link>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5 text-green-600 shrink-0" />
                                <span className="break-words">Membership</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="/membership.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            Download Membership Document
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5 text-green-600 shrink-0" />
                                <span className="break-words">Reviews</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="/Fiche d'Evaluation CNERSH.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span className="text-base text-blue-700 dark:text-blue-400 group-hover:underline break-words flex-1">
                                            Download Fiche d&apos;Evaluation CNERSH
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    </a>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNERSH - National Ethics Committee for Health Research on Humans. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
