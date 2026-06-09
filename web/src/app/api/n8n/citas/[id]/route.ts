import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { actualizarCita } from "@/lib/services/citas";

// Cliente confirma o cancela su cita por WhatsApp.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<{ estado: "confirmada" | "cancelada" }>(req, ["estado"]);
  if ("error" in r) return r.error;
  const { estado } = r.data;
  if (estado !== "confirmada" && estado !== "cancelada") {
    return fail("estado debe ser 'confirmada' o 'cancelada'");
  }
  try {
    const c = await actualizarCita(params.id, estado);
    return ok(c);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
