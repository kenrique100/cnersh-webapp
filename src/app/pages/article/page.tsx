import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeftIcon,
    Calendar,
    Clock,
    User as UserIcon,
    Tag,
    Share2,
    Bookmark,
    ChevronLeft,
    ChevronRight,
    Quote,
    Info,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";
import {
    CATEGORY_STYLES,
    formatArticleDate,
    getArticleBySlug,
    getRelatedArticles,
    listArticles,
    type ArticleBlock,
} from "@/lib/articles";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
    params: Promise<{ slug: string }>;
}

/* --------------------------------------------------------------------- */
/* Table of contents                                                     */
/* --------------------------------------------------------------------- */

interface TocEntry {
    id: string;
    text: string;
    level: 2 | 3;
}

function buildToc(blocks: ArticleBlock[]): TocEntry[] {
    const headings: TocEntry[] = [];
    blocks.forEach((b, idx) => {
        if (b.type === "heading") {
            headings.push({
                id: `h-${idx}`,
                text: b.text,
                level: b.level,
            });
        }
    });
    return headings;
}

/* --------------------------------------------------------------------- */
/* Block renderer                                                        */
/* --------------------------------------------------------------------- */

function ArticleBlockView({
                              block,
                              index,
                          }: {
    block: ArticleBlock;
    index: number;
}) {
    switch (block.type) {
        case "heading": {
            const id = `h-${index}`;
            if (block.level === 3) {
                return (
                    <h3
                        id={id}
                        className="mt-8 mb-3 scroll-mt-24 text-base font-semibold text-gray-900 dark:text-gray-100"
                    >
                        {block.text}
                    </h3>
                );
            }
            return (
                <h2
                    id={id}
                    className="mt-10 mb-4 scroll-mt-24 text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-100"
                >
                    {block.text}
                </h2>
            );
        }

        case "paragraph":
            return (
                <p className="mb-5 text-[15px] leading-7 text-gray-700 dark:text-gray-300">
                    {block.text}
                </p>
            );

        case "list":
            if (block.ordered) {
                return (
                    <ol className="mb-6 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-gray-700 marker:text-blue-700 dark:text-gray-300 dark:marker:text-blue-400">
                        {block.items.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ol>
                );
            }
            return (
                <ul className="mb-6 space-y-2 text-[15px] leading-7 text-gray-700 dark:text-gray-300">
                    {block.items.map((item, i) => (
                        <li key={i} className="flex gap-2.5">
                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            );

        case "quote":
            return (
                <figure className="my-8 border-l-4 border-blue-600 bg-blue-50/60 py-4 pl-5 pr-6 dark:border-blue-500 dark:bg-blue-950/30">
                    <Quote className="mb-2 h-5 w-5 text-blue-700 dark:text-blue-400" />
                    <blockquote className="text-[15px] italic leading-7 text-gray-800 dark:text-gray-200">
                        {block.text}
                    </blockquote>
                    {block.attribution && (
                        <figcaption className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            — {block.attribution}
                        </figcaption>
                    )}
                </figure>
            );

        case "callout": {
            const variants = {
                info: {
                    wrapper:
                        "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30",
                    icon: "text-blue-700 dark:text-blue-400",
                    title: "text-blue-900 dark:text-blue-100",
                    text: "text-blue-900/90 dark:text-blue-100/85",
                    Icon: Info,
                },
                warning: {
                    wrapper:
                        "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30",
                    icon: "text-amber-700 dark:text-amber-400",
                    title: "text-amber-900 dark:text-amber-100",
                    text: "text-amber-900/90 dark:text-amber-100/85",
                    Icon: AlertTriangle,
                },
                success: {
                    wrapper:
                        "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
                    icon: "text-emerald-700 dark:text-emerald-400",
                    title: "text-emerald-900 dark:text-emerald-100",
                    text: "text-emerald-900/90 dark:text-emerald-100/85",
                    Icon: CheckCircle2,
                },
            } as const;
            const v = variants[block.variant];
            const Icon = v.Icon;
            return (
                <aside className={`my-6 rounded-xl border p-4 ${v.wrapper}`}>
                    <div className="mb-1 flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${v.icon}`} />
                        <p className={`text-sm font-semibold ${v.title}`}>{block.title}</p>
                    </div>
                    <p className={`text-sm leading-relaxed ${v.text}`}>{block.text}</p>
                </aside>
            );
        }

        default:
            return null;
    }
}

/* --------------------------------------------------------------------- */
/* Page                                                                  */
/* --------------------------------------------------------------------- */

export default async function ArticlePage({ params }: ArticlePageProps) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    if (!article) notFound();

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
            console.error("Error fetching user data for article page:", error);
        }
    }

    const toc = buildToc(article.content);
    const related = getRelatedArticles(article.slug, 3);

    // Prev / next in chronological order
    const ordered = listArticles();                    // newest first
    const idx = ordered.findIndex((a) => a.slug === article.slug);
    const newer = idx > 0 ? ordered[idx - 1] : null;
    const older = idx < ordered.length - 1 ? ordered[idx + 1] : null;

    const style = CATEGORY_STYLES[article.category];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-sm">
                    <Link
                        href="/pages/articles"
                        className="flex items-center gap-1 text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">All articles</span>
                        <span className="sm:hidden">Back</span>
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {article.title}
                    </span>
                </div>

                {/* Hero */}
                <header className="relative mb-8 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 px-6 py-8 sm:px-10 sm:py-10 dark:border-blue-900/60 dark:from-blue-950/40 dark:via-gray-950 dark:to-violet-950/30">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/30" />
                    <div className="relative">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${style.badge}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {article.category}
                        </span>
                        <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl md:text-4xl dark:text-gray-100">
                            {article.title}
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base dark:text-gray-400">
                            {article.excerpt}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                                    <UserIcon className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                                </span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {article.author.name}
                                </span>
                                <span className="text-gray-400 dark:text-gray-500">
                                    · {article.author.role}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatArticleDate(article.publishedAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {article.readTimeMinutes} min read
                            </span>
                            {article.updatedAt && (
                                <span className="inline-flex items-center gap-1 italic">
                                    Updated {formatArticleDate(article.updatedAt)}
                                </span>
                            )}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                                <Tag className="h-3 w-3" />
                                {article.tags.join(" · ")}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Content + sidebar */}
                <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
                    {/* Article body */}
                    <article className="min-w-0">
                        <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardContent className="p-6 sm:p-8">
                                {article.content.map((block, i) => (
                                    <ArticleBlockView key={i} block={block} index={i} />
                                ))}
                            </CardContent>
                        </Card>

                        {/* Prev / next */}
                        <nav className="mt-6 grid gap-3 sm:grid-cols-2">
                            {older ? (
                                <Link
                                    href={`/pages/articles/${older.slug}`}
                                    className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-900"
                                >
                                    <p className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <ChevronLeft className="h-3 w-3" />
                                        Older
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
                                        {older.title}
                                    </p>
                                </Link>
                            ) : (
                                <div className="hidden sm:block" />
                            )}
                            {newer && (
                                <Link
                                    href={`/pages/articles/${newer.slug}`}
                                    className="group rounded-xl border border-gray-200 bg-white p-4 text-right transition-colors hover:border-blue-300 sm:col-start-2 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-900"
                                >
                                    <p className="flex items-center justify-end gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Newer
                                        <ChevronRight className="h-3 w-3" />
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
                                        {newer.title}
                                    </p>
                                </Link>
                            )}
                        </nav>
                    </article>

                    {/* Sidebar */}
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                        {/* Table of contents */}
                        {toc.length > 0 && (
                            <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                <CardContent className="p-5">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        On this page
                                    </p>
                                    <ul className="space-y-2 text-sm">
                                        {toc.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className={entry.level === 3 ? "pl-3" : ""}
                                            >
                                                <a
                                                    href={`#${entry.id}`}
                                                    className="block text-gray-600 underline-offset-2 hover:text-blue-700 hover:underline dark:text-gray-400 dark:hover:text-blue-400"
                                                >
                                                    {entry.text}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Author card */}
                        <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardContent className="p-5">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Author
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                                        <UserIcon className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {article.author.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {article.author.role}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Share */}
                        <Card className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardContent className="p-5">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Share
                                </p>
                                <div className="flex flex-col gap-2">
                                    <a
                                        href={`mailto:?subject=${encodeURIComponent(article.title)}&body=Read this article on CNERSH: ${encodeURIComponent(`/pages/articles/${article.slug}`)}`}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-blue-900 dark:hover:text-blue-400"
                                    >
                                        <Share2 className="h-3.5 w-3.5" />
                                        Share via email
                                    </a>
                                    <button
                                        type="button"
                                        disabled
                                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-600"
                                        title="Coming soon"
                                    >
                                        <Bookmark className="h-3.5 w-3.5" />
                                        Save for later
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>

                {/* Related */}
                {related.length > 0 && (
                    <section className="mt-12">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Related articles
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {related.map((r) => {
                                const rStyle = CATEGORY_STYLES[r.category];
                                return (
                                    <Link
                                        key={r.slug}
                                        href={`/pages/articles/${r.slug}`}
                                        className="group block"
                                    >
                                        <Card className="h-full rounded-xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-900">
                                            <CardContent className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${rStyle.badge}`}
                                                >
                                                    <span
                                                        className={`h-1 w-1 rounded-full ${rStyle.dot}`}
                                                    />
                                                    {r.category}
                                                </span>
                                                <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
                                                    {r.title}
                                                </p>
                                                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                                    {r.excerpt}
                                                </p>
                                                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {r.readTimeMinutes} min
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400">
                                                        Read
                                                        <ArrowRight className="h-3 w-3" />
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                    CNERSH © {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}