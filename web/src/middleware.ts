export { default } from "next-auth/middleware";

// Protege todas las rutas excepto login, la API de auth y los estáticos.
// Sin sesión, NextAuth redirige a /login automáticamente.
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
