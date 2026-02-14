import { authIsRequired } from "@/lib/auth-utils";
import { getTopics } from "@/app/actions/community";
import CommunityClient from "@/components/community-client";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
    await authIsRequired();

    const { topics } = await getTopics(undefined, 1, 20);

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Community
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Participate in discussions with the community
                    </p>
                </div>
                <CommunityClient
                    initialTopics={JSON.parse(JSON.stringify(topics))}
                />
            </div>
        </div>
    );
}
