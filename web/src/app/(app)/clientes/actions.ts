"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/guard";
import { parsear, clienteSchema } from "@/lib/validaciones";

export async function crearClienteAction(form: { nombre: string; tipo: string; telefono: string; email: string }) {
  await requireSession();
  const d = parsear(clienteSchema, form);
  await prisma.cliente.create({
    data: {
      nombre: d.nombre,
      tipo: d.tipo === "Moral" ? "moral" : "fisica",
      telefono: d.telefono || null,
      email: d.email || null,
    },
  });
  revalidatePath("/clientes");
}

export async function editarClienteAction(id: string, form: { nombre: string; tipo: string; telefono: string; email: string }) {
  await requireSession();
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
  await requireSession();
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
