import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MiPinClient from "./client";

export type ResultadoPin = { ok: true; pin: string | null } | { ok: false; error: string };

export default async function MiPinPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { pin: true },
  });

  // El motivo del fallo viaja como dato de retorno: Next reemplaza el mensaje de
  // cualquier throw de un server action por un genérico en producción.
  async function guardar(pin: string): Promise<ResultadoPin> {
    "use server";
    const sesion = await getServerSession(authOptions);
    if (!sesion?.user?.id) return { ok: false, error: "No hay sesión activa" };

    const limpio = pin.trim();
    if (limpio === "") {
      await prisma.usuario.update({
        where: { id: sesion.user.id },
        data: { pin: null, pinGenerado: false },
      });
      return { ok: true, pin: null };
    }
    if (!/^\d{4,8}$/.test(limpio)) return { ok: false, error: "El PIN debe ser de 4 a 8 dígitos" };

    // El PIN es único en todo el despacho: hay que revisar que no lo tenga alguien más.
    const ocupado = await prisma.usuario.findFirst({
      where: { pin: limpio, NOT: { id: sesion.user.id } },
      select: { id: true },
    });
    if (ocupado) return { ok: false, error: "Ese PIN ya lo tiene otra persona, elige otro" };

    await prisma.usuario.update({
      where: { id: sesion.user.id },
      data: { pin: limpio, pinGenerado: false },
    });
    return { ok: true, pin: limpio };
  }

  return <MiPinClient pinActual={usuario?.pin ?? null} guardar={guardar} />;
}
