import { Button } from "@/components/ui/button";
import { UserProps } from "@/hooks/use-user";
import { Checkbox } from "@radix-ui/react-checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { CellActions } from "./cell-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<UserProps>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
            const name = row.getValue("name") as string;
            const image = row.original.image;
            const initials = name
                ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : "U";
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-gray-200 dark:border-gray-700">
                        <AvatarImage src={image || undefined} alt={name || ""} />
                        <AvatarFallback className="bg-blue-700 text-white text-xs font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <span className="capitalize font-medium">{name}</span>
                </div>
            );
        },
    },
    {
        accessorKey: "email",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Email
                    <ArrowUpDown />
                </Button>
            );
        },
        cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.getValue("role") as string;
            const roleColors: Record<string, string> = {
                admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                user: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
            };
            return (
                <Badge className={`${roleColors[role] || ""} capitalize`}>
                    {role}
                </Badge>
            );
        },
    },
    {
        accessorKey: "banned",
        header: "Status",
        cell: ({ row }) => {
            const banned = row.original.banned;
            return banned ? (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    Banned
                </Badge>
            ) : (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Active
                </Badge>
            );
        },
    },
    {
        accessorKey: "emailVerified",
        header: "Email verified",
        cell: ({ row }) => (
            <div className="capitalize">
                {row.getValue("emailVerified")?.toString()}
            </div>
        ),
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            return (
                <CellActions
                    id={row.original.id}
                    name={row.original.name}
                    role={row.original.role}
                    email={row.original.email}
                    emailVerified={row.original.emailVerified}
                    hasDeletePermission={row.original.hasDeletePermission}
                    image={row.original.image}
                    banned={row.original.banned}
                />
            );
        },
    },
];