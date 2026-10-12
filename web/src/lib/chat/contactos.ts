import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { digitosTelefono, e164Whatsapp, normalizarTelefonoWhatsapp, sourceIdWhatsapp } from "./telefono";

export async function canalPorDefecto() {
  return prisma.canalWhatsapp.findFirst({ where: { activo: true }, orderBy: { creadoEn: "asc" } });
}

type DatosContacto = { nombre?: string; telefono: unknown; respaldo: string };

// Un contacto por canal y teléfono. Un número que no es mexicano conserva todos sus dígitos.
export async function asegurarContacto(canalId: string, datos: DatosContacto) {
  const tel = normalizarTelefonoWhatsapp(datos.telefono, datos.respaldo);
  const buscar = () =>
    prisma.contactoWhatsapp.findUnique({
      where: { canalId_telefonoNormalizado: { canalId, telefonoNormalizado: tel.clave } },
    });
  const existente = await buscar();
  if (existente) return { contacto: existente, creado: false };

  const digitos = digitosTelefono(datos.telefono);
  const telefono = digitos ? e164Whatsapp(digitos) : tel.telefono;
  try {
    const contacto = await prisma.contactoWhatsapp.create({
      data: {
        canalId,
        nombre: datos.nombre?.trim() || telefono,
        telefono,
        telefonoNormalizado: tel.clave,
        sourceId: digitos ? sourceIdWhatsapp(digitos) : tel.clave,
      },
    });
    return { contacto, creado: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repetido = await buscar();
      if (repetido) return { contacto: repetido, creado: false };
    }
    throw error;
  }
}

export async function asegurarContactoDeConversacion(conv: {
  id: string;
  canalId: string;
  nombreContacto: string;
  telefono: string;
  contactoWhatsappId: string | null;
}) {
  if (conv.contactoWhatsappId) {
    return prisma.contactoWhatsapp.findUniqueOrThrow({ where: { id: conv.contactoWhatsappId } });
  }
  const { contacto } = await asegurarContacto(conv.canalId, {
    nombre: conv.nombreContacto,
    telefono: conv.telefono,
    respaldo: conv.id,
  });
  await prisma.conversacion.update({ where: { id: conv.id }, data: { contactoWhatsappId: contacto.id } });
  return contacto;
}
