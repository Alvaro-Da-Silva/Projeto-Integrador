import { createAuthClient } from "better-auth/react";
import { adminClient, jwtClient, inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    jwtClient(),
    inferAdditionalFields({ user: { patent: { type: "string", required: false } } })
  ]
});