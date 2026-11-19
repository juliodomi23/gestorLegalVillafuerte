import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { usuarioPorTelefono } from "@/lib/services/usuarios";
import { hoyISO, preguntasPendientesDe } from "@/lib/services/productividad";

// Preguntas de hoy que este trabajador aún no contesta (contexto para la tool de captura).
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const telefono = new URL(req.url).searchParams.get("telefono");
  if (!telefono) return fail("Falta el parámetro ?telefono");
  const u = await usuarioPorTelefono(telefono);
  if (!u) return fail("Usuario no encontrado", 404);
  return ok({ usuarioId: u.id, nombre: u.nombre, preguntas: await preguntasPendientesDe(u.id, hoyISO()) });
}
