import { toNextJsHandler } from "better-auth/next-js";

import { getAuth, hasDomainAdmin } from "@/lib/auth";

async function handle(request: Request) {
  const auth = getAuth();
  const path = new URL(request.url).pathname;
  if (path.includes("%")) return Response.json({ error: "Rota inválida." }, { status: 400 });

  const segments = path.split("/").filter(Boolean);

  if (segments.includes("admin")) {
    if (request.method !== "GET" || segments.at(-1) !== "list-users") {
      return Response.json({ error: "Alterações de identidade exigem provisionamento supervisionado." }, { status: 403 });
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return Response.json({ error: "Sessão não informada." }, { status: 401 });

    if (!await hasDomainAdmin(session.user.id)) {
      return Response.json({ error: "Perfil sem permissão." }, { status: 403 });
    }
  }

  const { GET, POST } = toNextJsHandler(auth);

  return request.method === "GET" ? GET(request) : POST(request);
}

export const GET = handle;
export const POST = handle;
