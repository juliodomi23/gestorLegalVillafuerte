// Webhook saliente hacia n8n con bandeja de salida: el evento se guarda primero y se entrega después.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { descifrarTokenMeta } from "@/lib/meta/credentials";
import { esperaReintentoMs, evaluarUrlWebhook, firmarWebhook } from "./puro";

export const EVENTOS_WEBHOOK = [
  "message_created",
  "message_updated",
  "conversation_created",
  "conversation_status_changed",
  "conversation_updated",
  "contact_updated",
] as const;
export type EventoWebhook = (typeof EVENTOS_WEBHOOK)[number];

const numero = (valor: string | undefined, defecto: number) => Number(valor) || defecto;

export function hostsPermitidos(): string[] {
  return (process.env.WEBHOOK_HOSTS_PERMITIDOS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function validarUrlWebhook(url: string) {
  return evaluarUrlWebhook(url, hostsPermitidos(), process.env.WEBHOOK_PERMITIR_HTTP?.toLowerCase() === "true");
}

export async function emitirEvento(evento: EventoWebhook, payload: Record<string, unknown>, mensajeId?: string | null) {
  const destinos = await prisma.webhookIntegracion.findMany({
    where: { activo: true, eventos: { has: evento } },
    select: { id: true },
  });
  if (!destinos.length) return 0;
  await prisma.entregaWebhook.createMany({
    data: destinos.map((destino) => ({
      webhookId: destino.id,
      mensajeId: mensajeId ?? null,
      evento,
      payload: payload as Prisma.InputJsonValue,
    })),
  });
  iniciarMantenimiento();
  void despacharPendientes().catch(() => {});
  return destinos.length;
}

// Publicar un evento nunca debe tumbar la operación que lo originó.
export async function emitirEventoSeguro(evento: EventoWebhook, payload: Record<string, unknown>, mensajeId?: string | null) {
  try {
    return await emitirEvento(evento, payload, mensajeId);
  } catch (error) {
    console.error("[webhook-saliente] no se pudo encolar", evento, error instanceof Error ? error.message : "");
    return 0;
  }
}

let despachando = false;
let repetir = false;

// Si llegan eventos mientras se entrega otro lote, se vuelve a correr al terminar:
// nada espera al siguiente ciclo del temporizador.
export async function despacharPendientes(limite = 20) {
  if (despachando) {
    repetir = true;
    return;
  }
  despachando = true;
  try {
    do {
      repetir = false;
      await despacharLote(limite);
    } while (repetir);
  } finally {
    despachando = false;
  }
}

async function despacharLote(limite: number) {
  await prisma.entregaWebhook.updateMany({
    where: { estado: "enviando", actualizadoEn: { lt: new Date(Date.now() - 120_000) } },
    data: { estado: "pendiente" },
  });
  const lote = await prisma.entregaWebhook.findMany({
    where: { estado: "pendiente", proximoIntentoEn: { lte: new Date() } },
    orderBy: { creadoEn: "asc" },
    take: limite,
    include: { webhook: true },
  });
  for (const entrega of lote) {
    const tomada = await prisma.entregaWebhook.updateMany({
      where: { id: entrega.id, estado: "pendiente" },
      data: { estado: "enviando" },
    });
    if (tomada.count === 1) await entregar(entrega);
  }
}

type EntregaConWebhook = Prisma.EntregaWebhookGetPayload<{ include: { webhook: true } }>;

async function entregar(entrega: EntregaConWebhook) {
  const cerrar = (estado: "entregado" | "fallido", ultimoError: string | null) =>
    prisma.entregaWebhook.update({ where: { id: entrega.id }, data: { estado, ultimoError } });

  const webhook = entrega.webhook;
  if (!webhook || !webhook.activo) return cerrar("fallido", "Webhook eliminado o desactivado");
  const destino = validarUrlWebhook(webhook.url);
  if (!destino.ok) return cerrar("fallido", destino.motivo);

  const cuerpo = JSON.stringify(entrega.payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const encabezados: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "GestorLegal-Webhook/1",
    "X-Chatwoot-Event": entrega.evento,
    "X-Chatwoot-Delivery": entrega.id,
    "X-Chatwoot-Timestamp": timestamp,
  };
  if (webhook.secretoCifrado) {
    try {
      encabezados["X-Chatwoot-Signature"] = firmarWebhook(cuerpo, timestamp, descifrarTokenMeta(webhook.secretoCifrado));
    } catch {
      return cerrar("fallido", "No se pudo usar el secreto del webhook");
    }
  }

  let error: string | null = null;
  try {
    const respuesta = await fetch(destino.url, {
      method: "POST",
      headers: encabezados,
      body: cuerpo,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (respuesta.ok) return cerrar("entregado", null);
    error = `HTTP ${respuesta.status}`;
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message.slice(0, 200) : "Error de red";
  }

  const intentos = entrega.intentos + 1;
  const maximo = numero(process.env.WEBHOOK_MAX_INTENTOS, 6);
  await prisma.entregaWebhook.update({
    where: { id: entrega.id },
    data: {
      intentos,
      ultimoError: error,
      estado: intentos >= maximo ? "fallido" : "pendiente",
      proximoIntentoEn: new Date(Date.now() + esperaReintentoMs(intentos)),
    },
  });
}

export async function limpiarHistorial() {
  const dia = 86_400_000;
  const entregas = numero(process.env.CHAT_RETENCION_ENTREGAS_DIAS, 14);
  const auditoria = numero(process.env.CHAT_RETENCION_AUDITORIA_DIAS, 90);
  await prisma.entregaWebhook.deleteMany({
    where: { estado: { in: ["entregado", "fallido"] }, creadoEn: { lt: new Date(Date.now() - entregas * dia) } },
  });
  await prisma.auditoriaBot.deleteMany({ where: { creadoEn: { lt: new Date(Date.now() - auditoria * dia) } } });
}

// ponytail: temporizador dentro del proceso web; si se escala a varias instancias, moverlo a un cron de n8n.
let temporizador: ReturnType<typeof setInterval> | null = null;
let ultimaLimpieza = 0;

export function iniciarMantenimiento() {
  if (temporizador) return;
  temporizador = setInterval(() => {
    void despacharPendientes().catch(() => {});
    if (Date.now() - ultimaLimpieza > 3_600_000) {
      ultimaLimpieza = Date.now();
      void limpiarHistorial().catch(() => {});
    }
  }, 30_000);
  temporizador.unref?.();
}
