"use server";

import {authSession} from "@/lib/auth-utils";
import {db} from "@/lib/db";

export async function updateProfile() {
    const session = await authSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    return db.user.findUnique({
        where: {id: session.user.id},
        select: {
            email: true,
            name: true,
            image: true,
            twoFactorEnabled: true,
        },
    });
}