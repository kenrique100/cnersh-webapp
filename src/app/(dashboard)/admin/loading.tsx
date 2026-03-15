export default function AdminLoading() {
    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="animate-pulse space-y-4 sm:space-y-6">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-9 w-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-2">
                            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                    {/* Stat cards skeleton */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 sm:p-4">
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
                            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
                                <div className="px-4 sm:px-6 py-4 sm:py-5">
                                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((j) => (
                                            <div key={j} className="flex items-start gap-3">
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
        </div>
    );
}
