// Piezas sin base de datos ni alias de rutas: se prueban con node --test.
import { createHash, createHmac, randomBytes } from "node:crypto";

export const ESTADOS_CHATWOOT = ["open", "pending", "resolved", "snoozed"] as const;
export type EstadoChatwoot = (typeof ESTADOS_CHATWOOT)[number];

const A_CHATWOOT: Record<string, EstadoChatwoot> = {
  abierta: "open",
  pendiente: "pending",
  resuelta: "resolved",
  cerrada: "resolved",
  pospuesta: "snoozed",
};
const A_GESTOR: Record<EstadoChatwoot, string> = {
  open: "abierta",
  pending: "pendiente",
  resolved: "resuelta",
  snoozed: "pospuesta",
};

export function estadoChatwoot(estado: string): EstadoChatwoot {
  return A_CHATWOOT[estado] ?? "open";
}

export function estadoGestor(status: unknown): string | null {
  return A_GESTOR[String(status) as EstadoChatwoot] ?? null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generarToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token), prefijo: token.slice(0, 6) };
}

export function sanitizarEtiquetas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const vistas = new Set<string>();
  for (const item of valor) {
    const nombre = String(item ?? "").trim().slice(0, 60);
    if (nombre) vistas.add(nombre);
    if (vistas.size >= 50) break;
  }
  return [...vistas];
}

export function parsearIdNumerico(valor: string): bigint | null {
  return /^[1-9]\d{0,17}$/.test(valor) ? BigInt(valor) : null;
}

export function atributosValidos(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const entradas = Object.entries(valor as Record<string, unknown>);
  if (entradas.length > 50) return null;
  if (entradas.some(([clave]) => !clave || clave.length > 60)) return null;
  if (JSON.stringify(valor).length > 16_384) return null;
  return valor as Record<string, unknown>;
}

export function variablesDePlantillaApi(processed: unknown): string[] | null {
  if (processed === undefined || processed === null) return [];
  if (typeof processed !== "object" || Array.isArray(processed)) return null;
  const claves = Object.keys(processed as Record<string, unknown>);
  if (claves.some((clave) => !/^\d{1,2}$/.test(clave))) return null;
  return claves
    .sort((a, b) => Number(a) - Number(b))
    .map((clave) => String((processed as Record<string, unknown>)[clave] ?? ""));
}

type UrlEvaluada = { ok: true; url: URL } | { ok: false; motivo: string };

// Lista de hosts permitidos por entorno (no se bloquean redes privadas: n8n puede vivir en la red del servidor).
export function evaluarUrlWebhook(url: string, hostsPermitidos: string[], permitirHttp = false): UrlEvaluada {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, motivo: "URL inválida" };
  }
  if (parsed.username || parsed.password) return { ok: false, motivo: "La URL no debe llevar credenciales" };
  if (parsed.protocol !== "https:" && !(permitirHttp && parsed.protocol === "http:")) {
    return { ok: false, motivo: "La URL debe ser https" };
  }
  if (!hostsPermitidos.length) {
    return { ok: false, motivo: "Configura WEBHOOK_HOSTS_PERMITIDOS con los hosts de n8n permitidos" };
  }
  if (!hostsPermitidos.includes(parsed.hostname.toLowerCase())) {
    return { ok: false, motivo: "El host no está en WEBHOOK_HOSTS_PERMITIDOS" };
  }
  return { ok: true, url: parsed };
}

export function firmarWebhook(cuerpo: string, timestamp: string, secreto: string): string {
  return `sha256=${createHmac("sha256", secreto).update(`${timestamp}.${cuerpo}`).digest("hex")}`;
}

export function esperaReintentoMs(intentos: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, intentos - 1), 30 * 60_000);
}

export function crearLimitador() {
  const ventanas = new Map<string, { n: number; reinicia: number }>();
  return {
    permitir(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): boolean {
      if (ventanas.size > 5000) {
        for (const [llave, valor] of ventanas) if (valor.reinicia <= ahora) ventanas.delete(llave);
      }
      const actual = ventanas.get(clave);
      if (!actual || actual.reinicia <= ahora) {
        ventanas.set(clave, { n: 1, reinicia: ahora + ventanaMs });
        return true;
      }
      actual.n += 1;
      return actual.n <= maximo;
    },
  };
}
