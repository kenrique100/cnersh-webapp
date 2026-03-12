import Link from "next/link";
import { ArrowLeftIcon, ShieldCheckIcon, FileTextIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function PrivacyTermsPage() {
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
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Privacy &amp; Terms</span>
                </div>

                {/* Page Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Privacy &amp; Terms
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            CNERSH privacy policy and terms of use
                        </p>
                    </div>
                </div>

                {/* Privacy Policy Section */}
                <Card className="mb-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Privacy Policy
                            </h2>
                        </div>

                        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    1. Information We Collect
                                </h3>
                                <p>
                                    CNERSH collects personal information that you provide when creating an account,
                                    submitting research protocols, or interacting with the platform. This includes your name,
                                    email address, institutional affiliation, and any data you include in protocol submissions.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    2. How We Use Your Information
                                </h3>
                                <p>
                                    We use collected information to process and review research ethics protocols,
                                    communicate decisions and updates, improve platform functionality, and ensure
                                    compliance with ethical research standards.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    3. Data Protection
                                </h3>
                                <p>
                                    We implement appropriate technical and organizational security measures to protect
                                    your personal data against unauthorized access, alteration, disclosure, or destruction.
                                    All protocol submissions and review data are handled with strict confidentiality.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    4. Data Sharing
                                </h3>
                                <p>
                                    Your personal data is not shared with third parties except as required for the
                                    ethics review process or when mandated by law. Committee members involved
                                    in protocol review have access only to information relevant to their review duties.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    5. Your Rights
                                </h3>
                                <p>
                                    You have the right to access, correct, or request deletion of your personal data.
                                    To exercise these rights, please contact the CNERSH administration through the
                                    Help Center.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Terms and Conditions Section */}
                <Card className="mb-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Terms and Conditions
                            </h2>
                        </div>

                        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    FOREWORD
                                </h3>
                                <p className="italic">
                                    The respect of ethical values is an important aspect of the day-to-day obligations of any public officer.
                                    Such values are indispensable in ensuring moral and professional standards in the Public Service, which
                                    inevitably leads to greater integrity in staff conduct.
                                </p>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    - Rev. Dr. Dieudonné MASS GAMS, Chairman
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    1. Acceptance of Terms
                                </h3>
                                <p>
                                    By creating an account and using the CNERSH platform, you agree to be bound by these
                                    Terms and Conditions. If you do not agree, you should not use the platform.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    2. User Responsibilities
                                </h3>
                                <p>
                                    Users are responsible for maintaining the confidentiality of their account credentials,
                                    providing accurate information in protocol submissions, and adhering to ethical
                                    research standards as outlined by CNERSH guidelines.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    3. Protocol Submissions
                                </h3>
                                <p>
                                    All research protocols submitted through the platform must comply with national
                                    and international ethical guidelines for research involving human participants.
                                    Submissions are subject to review by the CNERSH committee.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    4. Intellectual Property
                                </h3>
                                <p>
                                    The content and materials on this platform are the property of CNERSH.
                                    Users retain ownership of their submitted research protocols and associated documents.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    5. Limitation of Liability
                                </h3>
                                <p>
                                    CNERSH provides this platform on an &quot;as is&quot; basis. While we strive to ensure
                                    accuracy and reliability, CNERSH is not liable for any damages arising from the use
                                    of the platform or decisions made based on ethics review outcomes.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    6. Modifications
                                </h3>
                                <p>
                                    CNERSH reserves the right to modify these terms at any time. Users will be notified
                                    of significant changes. Continued use of the platform after modifications constitutes
                                    acceptance of the updated terms.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Footer */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    <p>
                        For questions about our privacy policy or terms, please contact us through the{" "}
                        <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                            Help Center
                        </Link>
                        .
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        CNERSH © {new Date().getFullYear()}
                    </p>
                </div>
            </main>
        </div>
    );
}
