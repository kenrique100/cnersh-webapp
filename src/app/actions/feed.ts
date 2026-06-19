    try {
        const mentions = [...data.content.matchAll(MENTION_REGEX)].map((m) => m[1].trim());
        if (mentions.length > 0) {
            const mentionedUsers = await db.user.findMany({
                where: { name: { in: mentions }, id: { not: session.user.id } },
                select: { id: true, email: true, name: true },
            });
            if (mentionedUsers.length > 0) {
                const mentionMessage = `${session.user.name || "Someone"} mentioned you in a post`;
                await db.notification.createMany({
                    data: mentionedUsers.map((u) => ({
                        type: "MENTION" as const,
                        message: mentionMessage,
                        link: "/feeds",
                        userId: u.id,
                    })),
                });

                // Send mention emails concurrently
                const emailPromises = mentionedUsers
                    .filter(u => u.email)
                    .map(u =>
                        sendNotificationEmail({
                            to: u.email,
                            userName: u.name || "User",
                            notificationMessage: mentionMessage,
                            notificationType: "MENTION",
                            actionUrl: "/feeds",
                        }).catch((err) => console.error("Error sending post mention email:", err))
                    );

                void Promise.allSettled(emailPromises);
            }
        }
    } catch (error) {
        console.error("Error creating post mention notifications:", error);
    }
