import { createAuthClient } from "better-auth/react";
import { adminClient, jwtClient, inferAdditionalFields } from 'better-auth/client/plugins'
import type { Auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASEPATH,
  plugins: [
    adminClient(),
    jwtClient(),
    inferAdditionalFields<Auth>()
  ]
});