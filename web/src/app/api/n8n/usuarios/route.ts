import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { usuarioPorTelefono } from "@/lib/services/usuarios";

// Identifica al abogado por su número de WhatsApp.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const telefono = new URL(req.url).searchParams.get("telefono");
  if (!telefono) return fail("Falta el parámetro ?telefono");
  const u = await usuarioPorTelefono(telefono);
  if (!u) return fail("Usuario no encontrado", 404);
  return ok(u);
}
