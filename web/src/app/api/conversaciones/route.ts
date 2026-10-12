import { NextResponse } from "next/server";
import { requerirChatAdmin } from "@/lib/chat/api";
import { listarConversaciones } from "@/lib/chat/servicio";

export const dynamic = "force-dynamic";

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const conversaciones = (await listarConversaciones()).map((item) => ({
    id: item.id,
    contacto: { nombre: item.nombreContacto, telefono: item.telefono },
    noLeidos: item.noLeidos,
    ultimoMensajeAt: item.ultimoMensajeAt,
    preview: item.mensajes[0]?.contenido || (item.mensajes[0] ? `[${item.mensajes[0].tipo}]` : ""),
    estado: item.estado,
    canalId: item.canal.id,
    canalNombre: item.canal.nombre,
    canalActivo: item.canal.activo,
    vinculo: item.cliente
      ? { tipo: "cliente", id: item.cliente.id, nombre: item.cliente.nombre }
      : item.prospecto
        ? { tipo: "prospecto", id: item.prospecto.id, nombre: item.prospecto.nombre }
        : null,
  }));
  return NextResponse.json({ conversaciones });
}
