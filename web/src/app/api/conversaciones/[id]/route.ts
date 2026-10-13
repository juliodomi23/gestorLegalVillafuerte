import { NextRequest, NextResponse } from "next/server";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { puedeReasignar } from "@/lib/chat/alcance";
import { obtenerConversacion } from "@/lib/chat/servicio";
import { etiquetasVista } from "@/lib/chat/vista";
import { atributosValidos, sanitizarEtiquetas } from "@/lib/bot/puro";
import {
  asignar,
  cambiarEstado,
  fusionarAtributos,
  publicarConversacion,
  quitarAtributo,
  reemplazarEtiquetas,
  resolverAsignado,
} from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const c = await obtenerConversacion(params.id, filtroConversaciones(permiso.acceso));
  if (!c) return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  return NextResponse.json({
    conversacion: {
      id: c.id,
      numero: Number(c.numeroCompat),
      estado: c.estado,
      nombreContacto: c.nombreContacto,
      telefono: c.telefono,
      atributos: c.atributos ?? {},
      canal: c.canal,
      cliente: c.cliente,
      prospecto: c.prospecto,
      responsable: c.responsable,
      etiquetas: etiquetasVista(c.etiquetas),
      etapa: c.etapa,
      citas: c.citas,
      asesorias: c.asesorias,
    },
    puedeReasignar: puedeReasignar(permiso.acceso.alcance),
  });
}

// Una sola ruta para lo que el panel cambia: estado, responsable, etiquetas y atributos.
// Reasignar solo puede administración o recepción; el resto trabaja sus propias conversaciones.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const { acceso } = permiso;
  const existente = await obtenerConversacion(params.id, filtroConversaciones(acceso));
  if (!existente) return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  if ("responsableId" in body && !puedeReasignar(acceso.alcance)) {
    return NextResponse.json({ error: "Solo recepción o administración pueden reasignar" }, { status: 403 });
  }

  if (body.estado !== undefined) {
    const valido = ["abierta", "pendiente", "resuelta", "pospuesta", "cerrada"].includes(String(body.estado));
    if (!valido) return NextResponse.json({ error: "estado inválido" }, { status: 400 });
    if (await cambiarEstado(params.id, String(body.estado))) {
      await publicarConversacion("conversation_status_changed", params.id, { status: { current_value: String(body.estado) } });
    }
  }
  if ("responsableId" in body) {
    const asignado = await resolverAsignado(body.responsableId);
    if (asignado.noEncontrado) return NextResponse.json({ error: "usuario inválido" }, { status: 400 });
    await asignar(params.id, asignado.id);
    await publicarConversacion("conversation_updated", params.id, { assignee_id: { current_value: asignado.id } });
  }
  if (body.etiquetas !== undefined) {
    const resultado = await reemplazarEtiquetas(params.id, sanitizarEtiquetas(body.etiquetas));
    if (resultado.cambio) {
      await publicarConversacion("conversation_updated", params.id, {
        label_list: { previous_value: resultado.antes, current_value: resultado.despues },
      });
    }
  }
  if (body.atributos !== undefined) {
    const nuevos = atributosValidos(body.atributos);
    if (!nuevos) return NextResponse.json({ error: "atributos inválidos" }, { status: 400 });
    await fusionarAtributos(params.id, nuevos);
    await publicarConversacion("conversation_updated", params.id, { custom_attributes: { current_value: nuevos } });
  }
  if (typeof body.quitarAtributo === "string" && body.quitarAtributo) {
    await quitarAtributo(params.id, body.quitarAtributo);
    await publicarConversacion("conversation_updated", params.id, { custom_attributes: { removed: body.quitarAtributo } });
  }
  return NextResponse.json({ ok: true });
}
