import { NextResponse } from "next/server";
import { requerirChatAdmin } from "@/lib/chat/api";
import { listarConversaciones } from "@/lib/chat/servicio";
import { etiquetasVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const conversaciones = (await listarConversaciones()).map((item) => ({
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
    etiquetas: etiquetasVista(item.etiquetas),
    vinculo: item.cliente
      ? { tipo: "cliente", id: item.cliente.id, nombre: item.cliente.nombre }
      : item.prospecto
        ? { tipo: "prospecto", id: item.prospecto.id, nombre: item.prospecto.nombre }
        : null,
  }));
  return NextResponse.json({ conversaciones });
}
