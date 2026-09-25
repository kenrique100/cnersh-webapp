"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, Loader2Icon } from "lucide-react";
import { renewProtocol } from "@/app/actions/project";

interface RenewProtocolButtonProps {
    projectId: string;
}

export default function RenewProtocolButton({ projectId }: RenewProtocolButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleClick = () => {
        setError(null);
        startTransition(async () => {
            try {
                await renewProtocol(projectId);
                router.refresh();
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to renew protocol"
                );
            }
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <Button
                onClick={handleClick}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
            >
                {isPending ? (
                    <>
                        <Loader2Icon className="h-4 w-4 mr-1.5 animate-spin" />
                        Renewing…
                    </>
                ) : (
                    <>
                        <RefreshCwIcon className="h-4 w-4 mr-1.5" />
                        Renew Protocol
                    </>
                )}
            </Button>
            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}