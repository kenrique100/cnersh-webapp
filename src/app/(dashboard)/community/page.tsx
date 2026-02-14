import { authIsRequired } from "@/lib/auth-utils";
import { getTopics, getCommunityUsers } from "@/app/actions/community";
import CommunityClient from "@/components/community-client";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
    await authIsRequired();

    const [{ topics }, users] = await Promise.all([
        getTopics(undefined, 1, 50),
        getCommunityUsers(),
    ]);

    return (
        <CommunityClient
            initialTopics={JSON.parse(JSON.stringify(topics))}
            users={JSON.parse(JSON.stringify(users))}
        />
    );
}
