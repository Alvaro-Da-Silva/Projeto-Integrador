// Somente testes de domínio. Nunca importado pelo código de produção.
export function mockAuthProvider() {
  return {api:{getSession:async ({headers}) => {
    const id = /^test-session=([1-9]\d*)$/.exec(headers.get('cookie') || '')?.[1];
    return id ? {user:{id:`auth-${id}`},session:{userId:`auth-${id}`,expiresAt:new Date(Date.now()+60000)}} : null;
  }}};
}
