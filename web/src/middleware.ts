export { default } from "next-auth/middleware";

// Protege todas las rutas excepto login, la API de auth, el reloj checador
// (público a propósito: se abre desde la etiqueta NFC sin sesión) y los
// estáticos (incluye archivos públicos como Logo.jpg, cualquier ruta con extensión).
// Sin sesión, NextAuth redirige a /login automáticamente.
export const config = {
  matcher: ["/((?!login|checar|api/auth|api/n8n|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
