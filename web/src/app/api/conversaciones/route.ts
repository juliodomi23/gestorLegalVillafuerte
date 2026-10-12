import { NextResponse } from "next/server";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { puedeReasignar, requiereAtencion } from "@/lib/chat/alcance";
import { listarConversaciones } from "@/lib/chat/servicio";
import { etiquetasVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

export async function GET() {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const { acceso } = permiso;
  const conversaciones = (await listarConversaciones(filtroConversaciones(acceso))).map((item) => {
    const etiquetas = etiquetasVista(item.etiquetas);
    return {
      id: item.id,
      numero: Number(item.numeroCompat),
      contacto: { nombre: item.nombreContacto, telefono: item.telefono },
      noLeidos: item.noLeidos,
      ultimoMensajeAt: item.ultimoMensajeAt,
      preview: item.mensajes[0]?.contenido || (item.mensajes[0] ? `[${item.mensajes[0].tipo}]` : ""),
      estado: item.estado,
      canalId: item.canal.id,
      canalNombre: item.canal.nombre,
      canalActivo: item.canal.activo,
      responsable: item.responsable ? { id: item.responsable.id, nombre: item.responsable.nombre } : null,
      etiquetas,
      requiereAtencion: requiereAtencion({
        estado: item.estado,
        responsableId: item.responsable?.id ?? null,
        etiquetas: etiquetas.map((etiqueta) => etiqueta.nombre),
      }),
      vinculo: item.cliente
        ? { tipo: "cliente", id: item.cliente.id, nombre: item.cliente.nombre }
        : item.prospecto
          ? { tipo: "prospecto", id: item.prospecto.id, nombre: item.prospecto.nombre }
          : null,
    };
  });
  return NextResponse.json({
    conversaciones,
    acceso: { alcance: acceso.alcance, usuarioId: acceso.usuarioId, puedeReasignar: puedeReasignar(acceso.alcance) },
  });
}
