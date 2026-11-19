import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { usuarioPorTelefono } from "@/lib/services/usuarios";
import { hoyISO, marcarRespuesta, preguntasPendientesDe } from "@/lib/services/productividad";

type Body = { telefono: string; plantillaId: string; respuesta: "si" | "no"; fecha?: string };

// Guarda la respuesta sí/no de un trabajador. Solo acepta preguntas realmente pendientes
// para él en esa fecha, para que el LLM no pueda inventar ni reusar un id viejo.
export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const body = await leerBody<Body>(req, ["telefono", "plantillaId", "respuesta"]);
  if ("error" in body) return body.error;
  const { telefono, plantillaId, respuesta, fecha } = body.data;
  if (respuesta !== "si" && respuesta !== "no") return fail("respuesta debe ser 'si' o 'no'");
  if (fecha !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fail("fecha debe ser YYYY-MM-DD");

  const u = await usuarioPorTelefono(telefono);
  if (!u) return fail("Usuario no encontrado", 404);

  const dia = fecha ?? hoyISO();
  const pendientes = await preguntasPendientesDe(u.id, dia);
  if (!pendientes.some((p) => p.plantillaId === plantillaId)) {
    return fail("Esa pregunta no está pendiente: ya se contestó, no se le preguntó, o pasaron más de 20 min desde que se envió (ya no cuenta)", 409);
  }
  await marcarRespuesta(plantillaId, dia, u.id, respuesta);
  return ok({ plantillaId, respuesta, fecha: dia });
}
