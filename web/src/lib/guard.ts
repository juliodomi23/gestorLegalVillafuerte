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

export async function requireAdmin(): Promise<Sesion> {
  const sesion = await requireSession();
  if (sesion.rol !== "admin") throw new Error("Requiere rol de administrador");
  return sesion;
}
