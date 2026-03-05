"use client";

import { UserProps } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CellActions } from "./cell-actions";

export const MobileUserCard = ({ user }: { user: UserProps }) => {
    const initials = user.name
        ? user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "U";

    const roleColors: Record<string, string> = {
        admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        user: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };

    return (
        <Card className="w-full">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700 shrink-0">
                            <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                            <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="capitalize font-medium text-sm truncate">{user.name}</span>
                            <span className="text-xs text-gray-500 truncate">{user.email}</span>
                        </div>
                    </div>
                    <CellActions
                        id={user.id}
                        name={user.name}
                        role={user.role}
                        email={user.email}
                        emailVerified={user.emailVerified}
                        hasDeletePermission={user.hasDeletePermission}
                        image={user.image}
                        banned={user.banned}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge className={`${roleColors[user.role] || ""} capitalize text-xs px-2`}>
                        {user.role}
                    </Badge>
                    {user.banned ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs px-2">
                            Banned
                        </Badge>
                    ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs px-2">
                            Active
                        </Badge>
                    )}
                    {user.emailVerified !== undefined && (
                        <span className="text-xs text-gray-500">
                            Verified: {user.emailVerified ? "Yes" : "No"}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
