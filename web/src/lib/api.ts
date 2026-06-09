// Helpers para los endpoints de la API que consume n8n (los bots de WhatsApp).
// Autenticación simple por API key en el header `x-api-key`.

export function autorizado(req: Request): boolean {
  const key = req.headers.get("x-api-key");
  return !!process.env.N8N_API_KEY && key === process.env.N8N_API_KEY;
}

export function ok(data: unknown, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

export function noAutorizado() {
  return fail("No autorizado: API key inválida o ausente.", 401);
}

// Lee y valida el JSON del body; lanza si falta algún campo requerido.
export async function leerBody<T extends Record<string, unknown>>(
  req: Request,
  requeridos: (keyof T)[] = []
): Promise<{ data: T } | { error: Response }> {
  let body: T;
  try {
    body = (await req.json()) as T;
  } catch {
    return { error: fail("Body inválido: se esperaba JSON.") };
  }
  for (const campo of requeridos) {
    if (body[campo] === undefined || body[campo] === null || body[campo] === "") {
      return { error: fail(`Falta el campo requerido: ${String(campo)}`) };
    }
  }
  return { data: body };
}
