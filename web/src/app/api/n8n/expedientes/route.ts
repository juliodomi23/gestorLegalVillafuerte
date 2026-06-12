import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { crearExpediente, obtenerExpedientePorNumero, buscarPorCliente, type DatosExpediente } from "@/lib/services/expedientes";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosExpediente>(req, ["cliente"]);
  if ("error" in r) return r.error;
  try {
    const exp = await crearExpediente(r.data);
    await prisma.actuacion.create({
      data: {
        expedienteId: exp.id,
        tipo: "nota",
        descripcion: "Expediente creado",
        origen: "whatsapp",
      },
    });
    return ok(exp, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const params = new URL(req.url).searchParams;
  const numero = params.get("numero");
  const cliente = params.get("cliente");

  if (numero) {
    const exp = await obtenerExpedientePorNumero(numero);
    if (!exp) return fail("Expediente no encontrado", 404);
    return ok(exp);
  }

  if (cliente) {
    const exp = await buscarPorCliente(cliente);
    if (!exp) return fail("No se encontró expediente para ese cliente", 404);
    return ok(exp);
  }

  return fail("Falta el parámetro ?numero o ?cliente");
}
