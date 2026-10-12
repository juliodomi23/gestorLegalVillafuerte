import { createHmac } from "node:crypto";
import { META_GRAPH_URL } from "@/lib/meta/config";
import { motivoDeErrorMeta } from "@/lib/meta/errores";
import { tokenDesdeConfig } from "@/lib/meta/credentials";
export { normalizarEstadosMeta, normalizarMensajesMeta } from "./normalizar";
import { MEDIA_MAX_BYTES } from "@/lib/chat/media";
import type {
  PlantillaMeta,
  ProveedorCanal,
  ResultadoEnvio,
  ResultadoMedia,
} from "./types";

type ConfigCanal = {
  tokenEncrypted?: string;
  mock?: boolean;
};

function usarMock(config?: ConfigCanal): boolean {
  return config?.mock === true || process.env.WHATSAPP_CLOUD_API_MOCK?.toLowerCase() === "true";
}

function bloquearRedMeta() {
  if (process.env.WHATSAPP_BLOQUEAR_RED_META?.toLowerCase() === "true") {
    throw new Error("La red hacia Meta está bloqueada para esta prueba");
  }
}

async function graph(path: string, token: string, init?: RequestInit) {
  bloquearRedMeta();
  const response = await fetch(`${META_GRAPH_URL}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(motivoDeErrorMeta(data?.error));
  return data;
}

export function crearProveedorCloudApi(
  phoneNumberId: string,
  wabaId: string,
  config?: ConfigCanal,
): ProveedorCanal {
  const mock = usarMock(config);
  const token = mock ? "mock" : tokenDesdeConfig(config);
  const enviar = async (body: unknown): Promise<ResultadoEnvio> => {
    if (mock) return { ok: true, waMessageId: `mock-${Date.now()}-${Math.random().toString(16).slice(2)}` };
    try {
      const data = await graph(`${phoneNumberId}/messages`, token, { method: "POST", body: JSON.stringify(body) });
      return { ok: true, waMessageId: data?.messages?.[0]?.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Meta rechazó el mensaje" };
    }
  };
  return {
    enviarTexto: (telefono, texto) =>
      enviar({ messaging_product: "whatsapp", to: telefono, type: "text", text: { body: texto } }),
    enviarPlantilla: (telefono, plantilla, variables) =>
      enviar({
        messaging_product: "whatsapp",
        to: telefono,
        type: "template",
        template: {
          name: plantilla.name,
          language: { code: plantilla.language },
          components: variables.length
            ? [{ type: "body", parameters: variables.map((text) => ({ type: "text", text })) }]
            : [],
        },
      }),
    listarPlantillas: async () => {
      if (mock) {
        return [{
          name: "seguimiento_demo",
          language: "es_MX",
          status: "APPROVED",
          components: [{ type: "BODY", text: "Hola {{1}}, damos seguimiento a tu consulta." }],
        }];
      }
      const data = await graph(`${wabaId}/message_templates?limit=100`, token);
      return (Array.isArray(data?.data) ? data.data : []) as PlantillaMeta[];
    },
    descargarMedia: async (mediaId): Promise<ResultadoMedia> => {
      if (mock) {
        const imagen = mediaId.startsWith("mock-image");
        return { ok: true, buffer: Buffer.from(imagen ? "mock-imagen" : "OggS-mock-audio"), mime: imagen ? "image/png" : "audio/ogg; codecs=opus" };
      }
      try {
        const datos = await graph(mediaId, token);
        if (!datos?.url) return { ok: false, error: "Meta no devolvió la URL del archivo" };
        if (Number(datos.file_size) > MEDIA_MAX_BYTES) return { ok: false, error: "El archivo supera el tamaño permitido" };
        bloquearRedMeta();
        const respuesta = await fetch(String(datos.url), {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(20_000),
        });
        if (!respuesta.ok) return { ok: false, error: "Meta rechazó la descarga del archivo" };
        const buffer = Buffer.from(await respuesta.arrayBuffer());
        if (buffer.length > MEDIA_MAX_BYTES) return { ok: false, error: "El archivo supera el tamaño permitido" };
        return { ok: true, buffer, mime: String(datos.mime_type || respuesta.headers.get("content-type") || "") };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "No se pudo descargar el archivo" };
      }
    },
  };
}

export async function consultarNumeroMeta(wabaId: string, phoneNumberId: string, token: string) {
  if (process.env.WHATSAPP_CLOUD_API_MOCK?.toLowerCase() === "true") {
    return { display_phone_number: "+52 55 0000 0000", verified_name: "Canal Demo" };
  }
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) throw new Error("META_APP_SECRET sin configurar");
  const proof = createHmac("sha256", appSecret).update(token).digest("hex");
  const data = await graph(`${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&limit=100&appsecret_proof=${proof}`, token);
  const phone = (Array.isArray(data?.data) ? data.data : []).find((item: any) => String(item.id) === phoneNumberId);
  if (!phone) throw new Error("Ese Phone Number ID no pertenece a la WABA");
  return phone;
}

export async function suscribirAppMeta(wabaId: string, token: string) {
  if (process.env.WHATSAPP_CLOUD_API_MOCK?.toLowerCase() === "true") return;
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) throw new Error("META_APP_SECRET sin configurar");
  const proof = createHmac("sha256", appSecret).update(token).digest("hex");
  await graph(`${wabaId}/subscribed_apps?appsecret_proof=${proof}`, token, { method: "POST" });
}
