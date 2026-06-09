"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function crearClienteAction(form: { nombre: string; tipo: string; telefono: string; email: string }) {
  await prisma.cliente.create({
    data: {
      nombre: form.nombre,
      tipo: form.tipo === "Moral" ? "moral" : "fisica",
      telefono: form.telefono || null,
      email: form.email || null,
    },
  });
  revalidatePath("/clientes");
}

export async function editarClienteAction(id: string, form: { nombre: string; tipo: string; telefono: string; email: string }) {
  await prisma.cliente.update({
    where: { id },
    data: {
      nombre: form.nombre,
      tipo: form.tipo === "Moral" ? "moral" : "fisica",
      telefono: form.telefono || null,
      email: form.email || null,
    },
  });
  revalidatePath("/clientes");
}

export async function borrarClienteAction(id: string) {
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
