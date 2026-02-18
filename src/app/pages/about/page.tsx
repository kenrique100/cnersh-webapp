import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, EyeIcon, TargetIcon, UsersIcon, ShieldCheckIcon, GlobeIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export default async function AboutUsPage() {
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
            {/* Navbar */}
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
                    <Link
                        href="/pages"
                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        Our Pages
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">About Us</span>
                </div>

                {/* Page Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            About Us
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            National Ethics Committee for Health Research on Humans
                        </p>
                    </div>
                </div>

                {/* Article Content */}
                <div className="space-y-6">
                    {/* Hero Image Section */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900">
                            <Image
                                src="/about-hero.png"
                                alt="CNEC - About Us"
                                fill
                                className="object-contain"
                                priority
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                            />
                        </div>
                    </Card>

                    {/* Who We Are */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                Who We Are
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                We are dedicated to ensuring the highest ethical standards in health research and clinical trials across Cameroon. Our commitment lies in safeguarding human participants, fostering transparency, and promoting integrity in every aspect of research.
                            </p>
                            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                The National Ethics Committee for Health Research on Humans (CNEC) reviews research proposals involving human participants to ensure they are ethically sound and compliant with relevant guidelines and regulations, protecting the rights, safety, and well-being of participants.
                            </p>

                            {/* Image Gallery */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-1.png"
                                        alt="CNEC - About Us Image 1"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-2.png"
                                        alt="CNEC - About Us Image 2"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-3.png"
                                        alt="CNEC - About Us Image 3"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-4.png"
                                        alt="CNEC - About Us Image 4"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vision & Mission */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <EyeIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                    Our Vision
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                    To be a globally recognized leader in ethical research governance, ensuring that all health research and clinical trials conducted in Cameroon adhere to the principles of integrity, accountability, and respect for human dignity, while fostering innovation and improving public health outcomes.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <TargetIcon className="w-5 h-5 text-green-600 shrink-0" />
                                    Our Mission
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                    To uphold the highest ethical standards in health research and clinical trials in Cameroon by ensuring the protection of human participants, fostering transparency and integrity in research, and strengthening the ethical review process across regional and institutional levels. Through robust policy frameworks and collaboration, we strive to enhance public trust, advance scientific excellence, and contribute to an equitable and resilient health system.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional Images */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardContent className="py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-5.png"
                                        alt="CNEC - About Us Image 5"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-6.png"
                                        alt="CNEC - About Us Image 6"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-7.png"
                                        alt="CNEC - About Us Image 7"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Core Values */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                Our Core Values
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
                                        <ShieldCheckIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Integrity</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Upholding the highest standards of honesty and transparency in all our operations.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
                                        <UsersIcon className="w-4 h-4 text-green-700 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Respect for Human Dignity</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Ensuring the protection and well-being of all research participants.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 shrink-0">
                                        <GlobeIcon className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Accountability</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Taking responsibility for ethical oversight and governance in health research.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900 shrink-0">
                                        <EyeIcon className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transparency</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Fostering open communication and clear ethical guidelines for all stakeholders.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bottom Images */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                        <CardContent className="py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-8.png"
                                        alt="CNEC - About Us Image 8"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/about-9.png"
                                        alt="CNEC - About Us Image 9"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
                                    <Image
                                        src="/about-10.png"
                                        alt="CNEC - About Us Image 10"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNEC - National Ethics Committee for Health Research on Humans. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
