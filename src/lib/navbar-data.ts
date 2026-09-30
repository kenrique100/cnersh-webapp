import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getPages } from "@/app/actions/page-actions";

export type NavbarUser = {
    name: string | null;
    email: string;
    image: string | null;
    gender: string | null;
    role: string | null;
};

export async function getNavbarData() {
    let user: NavbarUser | null = null;
    let notificationCount = 0;
    let pages: Awaited<ReturnType<typeof getPages>> = [];

    try {
        pages = await getPages().catch(() => []);

        const session = await authSession();

        if (session) {
            const [dbUser, unread] = await Promise.all([
                db.user
                    .findUnique({
                        where: { id: session.user.id },
                        select: {
                            name: true,
                            email: true,
                            image: true,
                            gender: true,
                            role: true,
                        },
                    })
                    .catch(() => null),
                getUnreadNotificationCount().catch(() => 0),
            ]);

            if (dbUser) user = dbUser;
            notificationCount = unread;
        }
    } catch (error) {
        console.error("Error fetching navbar data:", error);
    }

    return { user, notificationCount, pages };
}