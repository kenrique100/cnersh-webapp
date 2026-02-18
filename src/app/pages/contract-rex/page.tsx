import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, ArrowLeftIcon, BuildingIcon, GlobeIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export default async function ContractRexPage() {
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
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Contract Rex Org</span>
                </div>

                {/* Page Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 dark:bg-purple-900">
                        <BuildingIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Contract Rex Org
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Organization overview and resources
                        </p>
                    </div>
                </div>

                {/* Article Content */}
                <div className="space-y-6">
                    {/* Hero Image Section */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950">
                            <Image
                                src="/contract-rex-hero.png"
                                alt="Contract Rex Organization"
                                fill
                                className="object-contain"
                                priority
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                            />
                        </div>
                    </Card>

                    {/* Main Content Card */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <BuildingIcon className="w-5 h-5 text-purple-600 shrink-0" />
                                About Contract Rex
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                Contract Rex is an organization dedicated to providing comprehensive contract management and organizational support services. The organization focuses on streamlining processes, ensuring compliance, and fostering efficient collaboration across teams and institutions.
                            </p>

                            {/* Image Gallery Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-1.png"
                                        alt="Contract Rex Organization - Image 1"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-2.png"
                                        alt="Contract Rex Organization - Image 2"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-3.png"
                                        alt="Contract Rex Organization - Image 3"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-4.png"
                                        alt="Contract Rex Organization - Image 4"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                            </div>

                            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                Through its commitment to excellence and ethical standards, Contract Rex plays a vital role in supporting organizations with their contractual and operational needs, contributing to a more transparent and efficient ecosystem.
                            </p>

                            {/* Additional Images */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-5.png"
                                        alt="Contract Rex Organization - Image 5"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-6.png"
                                        alt="Contract Rex Organization - Image 6"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-7.png"
                                        alt="Contract Rex Organization - Image 7"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
                                        <GlobeIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resources</h3>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Access organizational resources, documentation, and contract management tools provided by Contract Rex.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 shrink-0">
                                        <FileTextIcon className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Documentation</h3>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Comprehensive documentation and guidelines for contract management and organizational compliance.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bottom Images */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
                        <CardContent className="py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-8.png"
                                        alt="Contract Rex Organization - Image 8"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                                    <Image
                                        src="/contract-rex-9.png"
                                        alt="Contract Rex Organization - Image 9"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
                                    <Image
                                        src="/contract-rex-10.png"
                                        alt="Contract Rex Organization - Image 10"
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
                        &copy; {new Date().getFullYear()} CNERSH - National Ethics Committee for Health Research on Humans. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
