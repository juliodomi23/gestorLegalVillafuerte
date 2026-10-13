import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { ESTADOS_ABIERTOS, ETIQUETAS_ATENCION, puedeReasignar, requiereAtencion } from "@/lib/chat/alcance";
import { listarConversaciones } from "@/lib/chat/servicio";
import { etiquetasVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

const LIMITE_LISTA = 200;

// Con miles de chats no se manda todo: las más recientes, las que piden atención y la que se abre
// por enlace. Quien busca (?q=) obtiene las coincidencias de toda la base.
export async function GET(req: NextRequest) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const { acceso } = permiso;
  const visibles = filtroConversaciones(acceso);
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim().slice(0, 60);
  const digitos = q.replace(/\D/g, "");
  const numero = Number(params.get("c")) || 0;

  const porBusqueda: Prisma.ConversacionWhereInput = q
    ? {
        OR: [
          { nombreContacto: { contains: q, mode: "insensitive" } },
          ...(digitos.length >= 4 ? [{ telefonoNormalizado: { contains: digitos } }] : []),
        ],
      }
    : {};
  const pidenAtencion: Prisma.ConversacionWhereInput = {
    responsableId: null,
    estado: { in: [...ESTADOS_ABIERTOS] },
    OR: [{ estado: "pendiente" }, { etiquetas: { some: { etiqueta: { nombre: { in: [...ETIQUETAS_ATENCION] } } } } }],
  };
  const [recientes, atencion, pedida, total] = await Promise.all([
    listarConversaciones({ AND: [visibles, porBusqueda] }, LIMITE_LISTA),
    q ? Promise.resolve([]) : listarConversaciones({ AND: [visibles, pidenAtencion] }, 300),
    numero ? listarConversaciones({ AND: [visibles, { numeroCompat: BigInt(numero) }] }, 1) : Promise.resolve([]),
    prisma.conversacion.count({ where: visibles }),
  ]);
  const unicas = new Map<string, (typeof recientes)[number]>();
  for (const item of [...pedida, ...recientes, ...atencion]) unicas.set(item.id, item);
  const lista = [...unicas.values()].sort(
    (a, b) => (b.ultimoMensajeAt?.getTime() ?? 0) - (a.ultimoMensajeAt?.getTime() ?? 0),
  );
  const conversaciones = lista.map((item) => {
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
      etapa: item.etapa ? { id: item.etapa.id, nombre: item.etapa.nombre, color: item.etapa.color } : null,
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
    total,
    acceso: { alcance: acceso.alcance, usuarioId: acceso.usuarioId, puedeReasignar: puedeReasignar(acceso.alcance) },
  });
}
