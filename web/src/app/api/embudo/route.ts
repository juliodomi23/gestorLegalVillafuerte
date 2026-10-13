import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { puedeReasignar, requiereAtencion } from "@/lib/chat/alcance";
import { listarConversaciones } from "@/lib/chat/servicio";
import { listarEtapas } from "@/lib/chat/embudo";
import { etiquetasVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

const LIMITE_COLUMNA = 60;

// El tablero respeta la misma visibilidad que el chat: administración y recepción ven todas,
// el resto solo las que le asignaron.
export async function GET() {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const { acceso } = permiso;
  const etapas = await listarEtapas();
  const primera = etapas[0]?.id ?? null;
  const visibles = filtroConversaciones(acceso);
  // Una consulta por columna: con miles de chats solo se traen las más recientes de cada una.
  const dondeEtapa = (etapaId: string): Prisma.ConversacionWhereInput => ({
    AND: [visibles, etapaId === primera ? { OR: [{ etapaId }, { etapaId: null }] } : { etapaId }],
  });
  const [porColumna, conteos] = await Promise.all([
    Promise.all(etapas.map((e) => listarConversaciones(dondeEtapa(e.id), LIMITE_COLUMNA))),
    Promise.all(etapas.map((e) => prisma.conversacion.count({ where: dondeEtapa(e.id) }))),
  ]);
  const totales = Object.fromEntries(etapas.map((e, i) => [e.id, conteos[i]]));
  const tarjetas = porColumna.flat().map((c) => {
    const etiquetas = etiquetasVista(c.etiquetas);
    return {
      id: c.id,
      numero: Number(c.numeroCompat),
      nombre: c.nombreContacto,
      telefono: c.telefono,
      etapaId: c.etapa?.id ?? primera,
      etapaDesde: c.etapaDesde,
      ultimoMensajeAt: c.ultimoMensajeAt,
      preview: c.mensajes[0]?.contenido || (c.mensajes[0] ? `[${c.mensajes[0].tipo}]` : ""),
      noLeidos: c.noLeidos,
      estado: c.estado,
      canalNombre: c.canal.nombre,
      responsable: c.responsable ? { id: c.responsable.id, nombre: c.responsable.nombre } : null,
      etiquetas,
      requiereAtencion: requiereAtencion({
        estado: c.estado,
        responsableId: c.responsable?.id ?? null,
        etiquetas: etiquetas.map((e) => e.nombre),
      }),
    };
  });
  return NextResponse.json({
    etapas: etapas.map((e) => ({ id: e.id, clave: e.clave, nombre: e.nombre, color: e.color, orden: e.orden })),
    tarjetas,
    totales,
    acceso: { alcance: acceso.alcance, puedeReasignar: puedeReasignar(acceso.alcance) },
  });
}
