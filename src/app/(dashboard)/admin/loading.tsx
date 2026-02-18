export default function AdminLoading() {
    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
                                <div className="space-y-3">
                                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
