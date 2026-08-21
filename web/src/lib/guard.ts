// Guards de autorización para server actions y rutas API internas.
// Los server actions son endpoints HTTP: cualquiera con sesión puede invocarlos
// directamente, así que el control de acceso NO puede vivir solo en el layout.
// Cada action debe llamar a requireSession() o requireAdmin() antes de tocar la BD.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Rol } from "@/lib/usuarios";

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  sucursal: string;
};

export async function requireSession(): Promise<Sesion> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");
  const u = session.user;
  return {
    id: u.id,
    nombre: u.name ?? "",
    email: u.email ?? "",
    rol: u.rol,
    sucursal: u.sucursal,
  };
}

// Productividad: los admin y quien tenga `verProductividad` (la coordinadora de
// operaciones). El permiso se consulta a la BD y no a la sesión: así quitarlo surte
// efecto de inmediato, sin esperar a que la persona vuelva a iniciar sesión.
export async function requireProductividad(): Promise<Sesion> {
  const sesion = await requireSession();
  if (sesion.rol === "admin") return sesion;
  const { prisma } = await import("@/lib/prisma");
  const u = await prisma.usuario.findUnique({
    where: { id: sesion.id },
    select: { verProductividad: true },
  });
  if (!u?.verProductividad) throw new Error("No tienes acceso a Productividad");
  return sesion;
}

export async function puedeVerProductividad(): Promise<boolean> {
  try {
    await requireProductividad();
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<Sesion> {
  const sesion = await requireSession();
  if (sesion.rol !== "admin") throw new Error("Requiere rol de administrador");
  return sesion;
}
