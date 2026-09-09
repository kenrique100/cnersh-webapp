export default function AuthLoading() {
    return (
        <div className="w-full max-w-md">
            <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-md bg-gray-200 dark:bg-gray-700" />
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
