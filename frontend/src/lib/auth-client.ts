import { createAuthClient } from "better-auth/react";
import { adminClient, jwtClient, inferAdditionalFields } from 'better-auth/client/plugins'
import type { Auth } from "./auth";
import { authPath } from "./app-paths";

export const authClient = createAuthClient({
  basePath: authPath,
  baseURL: typeof window === "undefined"
    ? undefined
    : new URL(authPath, window.location.origin).href,
  plugins: [
    adminClient(),
    jwtClient(),
    inferAdditionalFields<Auth>()
  ]
});