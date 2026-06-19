    try {
        const notifications: { type: "MENTION" | "COMMENT"; message: string; link: string; userId: string }[] = [];
        const emailRecipients: { email: string; name: string; message: string; type: string }[] = [];

        // Notify @mentioned users
        const mentionMatches = data.content.match(/@(\w+(?:\s\w+)?)/g);
        if (mentionMatches) {
            const mentionedNames = mentionMatches.map(m => m.slice(1).trim());
            const mentionedUsers = await db.user.findMany({
                where: { name: { in: mentionedNames }, banned: { not: true } },
                select: { id: true, email: true, name: true },
            });
            for (const u of mentionedUsers) {
                if (u.id !== session.user.id) {
                    const mentionMessage = `${session.user.name || "Someone"} mentioned you in the community`;
                    notifications.push({
                        type: "MENTION",
                        message: mentionMessage,
                        link: `/community`,
                        userId: u.id,
                    });
                    if (u.email) {
                        emailRecipients.push({
                            email: u.email,
                            name: u.name || "User",
                            message: mentionMessage,
                            type: "MENTION",
                        });
                    }
                }
            }
        }

        // Notify parent reply author when someone replies to their message
        if (data.parentId) {
            const parentReply = await db.communityReply.findUnique({
                where: { id: data.parentId },
                select: { userId: true, user: { select: { email: true, name: true } } },
            });
            if (parentReply && parentReply.userId !== session.user.id) {
                const replyMessage = `${session.user.name || "Someone"} replied to your message in the community`;
                notifications.push({
                    type: "COMMENT",
                    message: replyMessage,
                    link: `/community`,
                    userId: parentReply.userId,
                });
                if (parentReply.user?.email) {
                    emailRecipients.push({
                        email: parentReply.user.email,
                        name: parentReply.user.name || "User",
                        message: replyMessage,
                        type: "COMMENT",
                    });
                }
            }
        }

        if (notifications.length > 0) {
            await db.notification.createMany({ data: notifications });
        }

        // Send email notifications (dispatched concurrently)
        const emailPromises = emailRecipients
            .filter(r => r.email)
            .map(recipient =>
                sendNotificationEmail({
                    to: recipient.email,
                    userName: recipient.name,
                    notificationMessage: recipient.message,
                    notificationType: recipient.type,
                    actionUrl: "/community",
                }).catch((err) => console.error("Error sending community email:", err))
            );

        void Promise.allSettled(emailPromises);

        // Also notify admins about community activity
        await notifyAdmins({
            type: "COMMENT",
            message: `${session.user.name || "A user"} posted a reply in the community`,
            link: "/community",
            excludeUserId: session.user.id,
        });
    } catch (error) {
        console.error("Error creating community notifications:", error);
    }

    return reply;
