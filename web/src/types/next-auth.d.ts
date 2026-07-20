import type { Rol } from "@/lib/usuarios";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    rol: Rol;
    sucursal: string;
    debeCambiarPassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      rol: Rol;
      sucursal: string;
      debeCambiarPassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol?: Rol;
    sucursal?: string;
    debeCambiarPassword?: boolean;
  }
}
