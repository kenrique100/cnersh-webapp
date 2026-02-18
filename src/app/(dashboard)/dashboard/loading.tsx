export default function DashboardPageLoading() {
    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile header skeleton */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg mb-8 overflow-hidden animate-pulse">
                    <div className="h-32 bg-gray-200 dark:bg-gray-700" />
                    <div className="px-6 pb-6">
                        <div className="flex items-end gap-4 -mt-12">
                            <div className="h-24 w-24 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-950" />
                            <div className="space-y-2 pb-2">
                                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Quick access grid skeleton */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 animate-pulse">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
