// Rutas que no pasan por la sesión de NextAuth porque se protegen solas:
// - /api/meta/webhook: firma HMAC de Meta.
// - /api/v1/accounts/...: api_access_token (API de bots, ver lib/bot/auth.ts).
export function rutaPublicaSinSesion(pathname: string): boolean {
  return pathname === "/api/meta/webhook" || pathname.startsWith("/api/v1/accounts/");
}

export function autorizarRuta(pathname: string, autenticado: boolean): boolean {
  return rutaPublicaSinSesion(pathname) || autenticado;
}
