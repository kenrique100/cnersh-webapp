export default function NotificationsLoading() {
    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
