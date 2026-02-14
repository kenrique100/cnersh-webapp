import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, UsersIcon, FileTextIcon, SettingsIcon } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:bg-gray-950/80 dark:border-gray-800 shadow-sm">
                <div className="container mx-auto max-w-7xl">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Logo at Top Left */}
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-700 dark:bg-blue-600">
                                <Image
                                    src="/logo.png"
                                    alt="CNEC"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-contain"
                                    priority
                                />
                            </div>
                            <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-gray-100">
                                CNEC
                            </span>
                        </Link>

                        {/* Sign In and Sign Up buttons at Top Right */}
                        <div className="flex items-center gap-3">
                            <Link href="/sign-in">
                                <Button variant="ghost" className="text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/sign-up">
                                <Button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all">
                                    Sign Up
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12 sm:py-16 lg:py-20">
                    {/* Logo and Title */}
                    <div className="text-center space-y-6 mb-12">
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-blue-700 dark:bg-blue-600 shadow-2xl">
                                <Image
                                    src="/logo.png"
                                    alt="CNEC Logo"
                                    width={96}
                                    height={96}
                                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                                    priority
                                />
                            </div>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            Welcome to <span className="text-blue-700 dark:text-blue-500">CNEC</span>
                        </h1>
                        <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Cameroon National Ethics Community
                        </p>
                        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
                            A secure platform for managing ethical review processes and community collaboration
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mb-12">
                        <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 mb-4">
                                <ShieldCheckIcon className="w-6 h-6 text-blue-700 dark:text-blue-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Secure Access
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Two-factor authentication and role-based access control
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 mb-4">
                                <UsersIcon className="w-6 h-6 text-green-700 dark:text-green-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Community
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Collaborate with ethics professionals nationwide
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 mb-4">
                                <FileTextIcon className="w-6 h-6 text-purple-700 dark:text-purple-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Forms Management
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Create and manage ethical review forms efficiently
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 mb-4">
                                <SettingsIcon className="w-6 h-6 text-orange-700 dark:text-orange-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Customizable
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Personalize your profile and application settings
                            </p>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <Link href="/sign-up">
                            <Button size="lg" className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all">
                                Get Started
                            </Button>
                        </Link>
                        <Link href="/sign-in">
                            <Button size="lg" variant="outline" className="px-8 py-6 text-lg font-semibold border-2 border-gray-300 dark:border-gray-700 hover:border-blue-700 dark:hover:border-blue-500 transition-all">
                                Sign In to Continue
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNEC - Cameroon National Ethics Community. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}