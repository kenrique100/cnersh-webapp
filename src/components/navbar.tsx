import Link from "next/link";
import React from "react";

export default function Navbar() {
    return (
        <nav className="w-full bg-gray-900 text-white p-4 fixed top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-xl font-bold">
                    CNEC
                </Link>
                <div className="flex gap-6">
                    <Link href="/" className="hover:text-gray-300 transition">
                        Home
                    </Link>
                    <Link href="/about" className="hover:text-gray-300 transition">
                        About
                    </Link>
                    <Link href="/sign-in" className="hover:text-gray-300 transition">
                        Sign In
                    </Link>
                    <Link href="/sign-up" className="hover:text-gray-300 transition">
                        Sign Up
                    </Link>
                </div>
            </div>
        </nav>
    );
}