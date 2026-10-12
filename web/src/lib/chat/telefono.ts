export type TelefonoWhatsapp = {
  telefono: string;
  clave: string;
};

export function digitosTelefono(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function claveTelefono(valor: unknown): string {
  const digitos = digitosTelefono(valor);
  if (digitos.startsWith("521") || digitos.startsWith("52")) return digitos.slice(-10);
  return digitos;
}

export function normalizarTelefonoWhatsapp(valor: unknown, respaldo: string): TelefonoWhatsapp {
  const digitos = digitosTelefono(valor);
  if (!digitos) {
    const seguro = `sin-numero-${respaldo.replace(/[^a-zA-Z0-9_-]/g, "").slice(-48) || "mensaje"}`;
    return { telefono: seguro, clave: seguro };
  }
  const clave = claveTelefono(digitos);
  const esMexicano = digitos.startsWith("521") || digitos.startsWith("52");
  return { telefono: esMexicano ? `52${clave}` : digitos, clave };
}
