import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SERVICIOS = new Set([
  "confirmacion_cita",
  "llamada_asesoria",
  "asesoria_promocion",
  "asesoria_regular",
]);

type SolicitudLink = {
  servicio?: string;
  comision?: number;
  concepto?: string;
  email?: string;
  clienteId?: string;
  citaId?: string;
  asesoriaId?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.rol !== "admin") {
    return Response.json({ ok: false, error: "Requiere rol de administrador." }, { status: 403 });
  }

  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "No está configurada la conexión con n8n." }, { status: 500 });
  }

  let body: SolicitudLink;
  try {
    body = (await req.json()) as SolicitudLink;
  } catch {
    return Response.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  if (!body.servicio || !SERVICIOS.has(body.servicio)) {
    return Response.json({ ok: false, error: "Selecciona un servicio válido." }, { status: 400 });
  }

  const comision = Number(body.comision);
  if (!Number.isFinite(comision) || comision < 0) {
    return Response.json({ ok: false, error: "La comisión debe ser un importe válido." }, { status: 400 });
  }

  try {
    const respuesta = await fetch(
      "https://n8n.ambarrojo.cloud/webhook/gestorlegal/mercadopago/generar-enlace",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ ...body, comision }),
        cache: "no-store",
      },
    );

    const resultado = (await respuesta.json().catch(() => null)) as
      | { ok?: boolean; error?: string; [key: string]: unknown }
      | null;

    if (!respuesta.ok || !resultado?.ok) {
      return Response.json(
        { ok: false, error: resultado?.error || "Mercado Pago no pudo generar el enlace." },
        { status: 502 },
      );
    }

    return Response.json(resultado);
  } catch {
    return Response.json({ ok: false, error: "No fue posible comunicarse con n8n." }, { status: 502 });
  }
}
