import { authIsRequired } from "@/lib/auth-utils";
import { getNotifications } from "@/app/actions/notification";
import NotificationsClient from "@/components/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
    await authIsRequired();

    const { notifications, unreadCount } = await getNotifications(1, 50);

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 text-sm font-normal text-blue-600">
                                ({unreadCount} unread)
                            </span>
                        )}
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Stay updated with your activity
                    </p>
                </div>
                <NotificationsClient
                    initialNotifications={JSON.parse(JSON.stringify(notifications))}
                    unreadCount={unreadCount}
                />
            </div>
        </div>
    );
}
