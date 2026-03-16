export default function DashboardPageLoading() {
    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Profile header skeleton */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg mb-4 sm:mb-6 overflow-hidden animate-pulse">
                    <div className="h-20 sm:h-28 bg-gray-200 dark:bg-gray-700" />
                    <div className="px-3 sm:px-6 pb-4 sm:pb-5">
                        <div className="flex items-end gap-3 sm:gap-4 -mt-8 sm:-mt-10">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-950" />
                            <div className="space-y-2 pb-2">
                                <div className="h-4 sm:h-5 w-28 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-40 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Stat cards skeleton */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 sm:p-4 animate-pulse">
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
                                <div className="space-y-2 flex-1 min-w-0">
                                    <div className="h-5 sm:h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Content sections skeleton */}
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 animate-pulse overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 sm:py-5">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                                <div className="space-y-3">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="flex items-start gap-2.5 sm:gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                                                <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
