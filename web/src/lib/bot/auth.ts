import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWhatsappActivo } from "@/lib/chat/modulo";
import { crearLimitador, hashToken } from "./puro";
import { iniciarMantenimiento } from "./webhooks";

const porToken = crearLimitador();
const porIp = crearLimitador();
const ultimoUso = new Map<string, number>();
const numero = (valor: string | undefined, defecto: number) => Number(valor) || defecto;

export type ContextoBot = {
  tokenId: string;
  accion: string;
  conversacionId: string | null;
};

function ipDe(req: NextRequest): string {
  const cabecera = (process.env.IP_HEADER || "x-real-ip").toLowerCase();
  return req.headers.get(cabecera)?.split(",")[0]?.trim() || "desconocida";
}

function responder(status: number, error: string, extra?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: extra });
}

async function auditar(datos: {
  req: NextRequest;
  tokenId: string | null;
  fingerprint: string | null;
  status: number;
  accion: string;
  conversacionId: string | null;
}) {
  try {
    await prisma.auditoriaBot.create({
      data: {
        tokenId: datos.tokenId,
        tokenFingerprint: datos.fingerprint,
        metodo: datos.req.method,
        ruta: datos.req.nextUrl.pathname,
        statusHttp: datos.status,
        accion: datos.accion,
        conversacionId: datos.conversacionId,
        ipOrigen: ipDe(datos.req),
      },
    });
  } catch {
    // la bitácora nunca debe tumbar la petición
  }
}

// Punto único de entrada de /api/v1: bandera, cuenta, límite, token activo y bitácora.
export async function conBot(
  req: NextRequest,
  params: { accountId: string },
  accion: string,
  handler: (contexto: ContextoBot) => Promise<Response>,
): Promise<Response> {
  if (!chatWhatsappActivo() || params.accountId !== "1") return responder(404, "no encontrado");
  iniciarMantenimiento();

  const token = req.headers.get("api_access_token")?.trim() || "";
  const hash = token ? hashToken(token) : "";
  const ventanaMs = numero(process.env.BOT_RATE_LIMIT_WINDOW_MS, 60_000);
  if (hash && !porToken.permitir(`t:${hash}`, numero(process.env.BOT_RATE_LIMIT_MAX, 300), ventanaMs)) {
    return responder(429, "demasiadas peticiones", { "Retry-After": String(Math.ceil(ventanaMs / 1000)) });
  }

  const fila = hash ? await prisma.tokenIntegracion.findUnique({ where: { tokenHash: hash } }) : null;
  if (!fila || !fila.activo || fila.revocadoEn) {
    const ventanaFallos = numero(process.env.BOT_AUTH_FAIL_WINDOW_MS, 300_000);
    if (!porIp.permitir(`ip:${ipDe(req)}`, numero(process.env.BOT_AUTH_FAIL_MAX, 20), ventanaFallos)) {
      return responder(429, "demasiadas peticiones", { "Retry-After": String(Math.ceil(ventanaFallos / 1000)) });
    }
    await auditar({ req, tokenId: null, fingerprint: hash ? hash.slice(0, 8) : null, status: 401, accion: "token_invalido", conversacionId: null });
    return responder(401, "token inválido");
  }

  const contexto: ContextoBot = { tokenId: fila.id, accion, conversacionId: null };
  let respuesta: Response;
  try {
    respuesta = await handler(contexto);
  } catch (error) {
    console.error("[bot-api]", accion, error instanceof Error ? error.message : "");
    respuesta = responder(500, "error interno");
  }

  void auditar({
    req,
    tokenId: fila.id,
    fingerprint: hash.slice(0, 8),
    status: respuesta.status,
    accion: contexto.accion,
    conversacionId: contexto.conversacionId,
  });
  if (Date.now() - (ultimoUso.get(fila.id) ?? 0) > 60_000) {
    ultimoUso.set(fila.id, Date.now());
    void prisma.tokenIntegracion.update({ where: { id: fila.id }, data: { ultimoUsoEn: new Date() } }).catch(() => {});
  }
  return respuesta;
}
