import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIJO = "encv1";

function claveCifrado(): Buffer {
  const encoded = process.env.META_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("META_TOKEN_ENCRYPTION_KEY sin configurar");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("META_TOKEN_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes");
  return key;
}

export function cifrarTokenMeta(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", claveCifrado(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIJO, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function descifrarTokenMeta(value: string): string {
  const [prefijo, iv, tag, contenido] = value.split(":");
  if (prefijo !== PREFIJO || !iv || !tag || !contenido) throw new Error("credencial Meta cifrada inválida");
  const decipher = createDecipheriv("aes-256-gcm", claveCifrado(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(contenido, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function tokenDesdeConfig(config: unknown): string {
  const token = (config as { tokenEncrypted?: unknown } | null)?.tokenEncrypted;
  if (typeof token !== "string" || !token) throw new Error("canal de Meta sin credencial");
  return descifrarTokenMeta(token);
}
