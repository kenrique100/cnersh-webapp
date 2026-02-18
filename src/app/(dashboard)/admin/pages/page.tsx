import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminPagesClient from "./pages-client";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
    const session = await authIsRequired();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        redirect("/dashboard");
    }

    const pages = await db.page.findMany({
        where: { parentId: null },
        include: {
            items: {
                orderBy: { createdAt: "asc" },
            },
            children: {
                include: {
                    items: {
                        orderBy: { createdAt: "asc" },
                    },
                    children: {
                        include: {
                            items: {
                                orderBy: { createdAt: "asc" },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    return <AdminPagesClient pages={JSON.parse(JSON.stringify(pages))} />;
}
