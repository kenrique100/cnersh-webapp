export default function ProjectsLoading() {
    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-8 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-2">
                            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                    <div className="h-9 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                {/* Project cards skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 animate-pulse">
                            <div className="space-y-3">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
