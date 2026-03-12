import Link from "next/link";
import { ArrowLeftIcon, AccessibilityIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function AccessibilityPage() {
    const session = await authSession();

    let navUser = null;
    let notificationCount = 0;

    if (session) {
        try {
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
        } catch (error) {
            console.error("Error fetching user data for accessibility page:", error);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-2 mb-6 text-sm">
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Accessibility</span>
                </div>

                {/* Page Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <AccessibilityIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Accessibility
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Our commitment to accessible design
                        </p>
                    </div>
                </div>

                {/* Accessibility Statement */}
                <Card className="mb-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AccessibilityIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Accessibility Statement
                            </h2>
                        </div>

                        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                            <p>
                                CNERSH — the National Ethics Committee for Health Research on Humans — is committed
                                to ensuring that our platform is accessible to all users, including those with
                                disabilities. We strive to meet internationally recognized accessibility standards
                                so that every researcher, reviewer, and member of the public can use our services
                                effectively.
                            </p>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    1. Accessibility Standards
                                </h3>
                                <p>
                                    We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at
                                    Level AA. These guidelines explain how to make web content more accessible
                                    to people with a wide range of disabilities, including visual, auditory,
                                    physical, speech, cognitive, and neurological disabilities.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    2. Keyboard Navigation
                                </h3>
                                <p>
                                    All functionality on the CNERSH platform is available via keyboard navigation.
                                    Interactive elements such as buttons, links, and form fields can be accessed
                                    using the Tab key and activated using the Enter or Space keys.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    3. Screen Reader Support
                                </h3>
                                <p>
                                    Our platform is designed to work with popular screen readers. We use semantic
                                    HTML, ARIA labels, and descriptive alt text for images to ensure content
                                    is conveyed accurately to assistive technologies.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    4. Color Contrast and Visual Design
                                </h3>
                                <p>
                                    We maintain sufficient color contrast ratios between text and background
                                    elements. Our dark mode option provides an alternative visual experience
                                    for users who prefer reduced brightness. Text can be resized without
                                    loss of content or functionality.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    5. Forms and Protocol Submissions
                                </h3>
                                <p>
                                    All forms, including the protocol submission wizard, include clear labels,
                                    instructions, and error messages. Required fields are clearly marked, and
                                    validation errors are presented in an accessible manner.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    6. Responsive Design
                                </h3>
                                <p>
                                    The CNERSH platform is fully responsive and works across desktops, tablets,
                                    and mobile devices. Content reflows appropriately at different screen sizes
                                    to ensure usability on all devices.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    7. Continuous Improvement
                                </h3>
                                <p>
                                    We are continually working to improve the accessibility of the CNERSH platform.
                                    We regularly test our platform with assistive technologies and address any
                                    accessibility issues that are identified.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    8. Feedback
                                </h3>
                                <p>
                                    If you experience any difficulty accessing content or functionality on our platform,
                                    or if you have suggestions for improving accessibility, please contact us through
                                    the Help Center chat available at the bottom-right of every page. Your feedback
                                    helps us serve all users better.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Footer */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    <p>
                        For accessibility concerns or feedback, please use the{" "}
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Help Center chat
                        </span>
                        {" "}button at the bottom-right of the page to contact support.
                    </p>
                </div>
            </main>
        </div>
    );
}
