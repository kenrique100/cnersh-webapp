export default function AuthLoading() {
    return (
        <div className="w-full max-w-md animate-pulse">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="w-full space-y-3 mt-4">
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
