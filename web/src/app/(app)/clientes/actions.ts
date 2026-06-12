"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, type Sesion } from "@/lib/guard";
import { parsear, clienteSchema } from "@/lib/validaciones";

// Los clientes son privados: un abogado solo puede tocar los suyos.
async function exigirDuenoCliente(id: string, sesion: Sesion) {
  if (sesion.rol === "admin") return;
  const c = await prisma.cliente.findUnique({ where: { id }, select: { abogadoId: true } });
  if (!c || c.abogadoId !== sesion.id) throw new Error("Sin permiso sobre este cliente");
}

export async function crearClienteAction(form: { nombre: string; tipo: string; telefono: string; email: string }) {
  const sesion = await requireSession();
  const d = parsear(clienteSchema, form);
  await prisma.cliente.create({
    data: {
      nombre: d.nombre,
      tipo: d.tipo === "Moral" ? "moral" : "fisica",
      telefono: d.telefono || null,
      email: d.email || null,
      abogadoId: sesion.id,
    },
  });
  revalidatePath("/clientes");
}

export async function editarClienteAction(id: string, form: { nombre: string; tipo: string; telefono: string; email: string }) {
  const sesion = await requireSession();
  await exigirDuenoCliente(id, sesion);
  const d = parsear(clienteSchema, form);
  await prisma.cliente.update({
    where: { id },
    data: {
      nombre: d.nombre,
      tipo: d.tipo === "Moral" ? "moral" : "fisica",
      telefono: d.telefono || null,
      email: d.email || null,
    },
  });
  revalidatePath("/clientes");
}

export async function borrarClienteAction(id: string) {
  const sesion = await requireSession();
  await exigirDuenoCliente(id, sesion);
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
