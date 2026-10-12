import { withAuth } from "next-auth/middleware";
import { autorizarRuta } from "@/lib/autorizacion-middleware";

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => autorizarRuta(req.nextUrl.pathname, Boolean(token)),
  },
});

// El matcher conserva las rutas públicas existentes. Dentro de lo que sí atraviesa
// NextAuth, solo /api/meta/webhook se permite sin sesión; su propia ruta exige firma HMAC.
export const config = {
  matcher: ["/((?!login|checar|pago/resultado|api/auth|api/n8n|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
