import { NextResponse } from "next/server";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { puedeReasignar, requiereAtencion } from "@/lib/chat/alcance";
import { listarConversaciones } from "@/lib/chat/servicio";
import { listarEtapas } from "@/lib/chat/embudo";
import { etiquetasVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

// El tablero respeta la misma visibilidad que el chat: administración y recepción ven todas,
// el resto solo las que le asignaron.
export async function GET() {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const { acceso } = permiso;
  const [etapas, conversaciones] = await Promise.all([
    listarEtapas(),
    listarConversaciones(filtroConversaciones(acceso)),
  ]);
  const primera = etapas[0]?.id ?? null;
  const tarjetas = conversaciones.map((c) => {
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
    acceso: { alcance: acceso.alcance, puedeReasignar: puedeReasignar(acceso.alcance) },
  });
}
