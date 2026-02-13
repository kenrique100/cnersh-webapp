import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
    plugins: [
        twoFactorClient(),
        adminClient({
            ac,
            roles,
        }),
    ],
});