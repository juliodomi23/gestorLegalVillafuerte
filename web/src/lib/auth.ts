import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@/lib/usuarios";

// ponytail: contador de intentos en memoria del proceso; se resetea si el server
// reinicia y no se comparte entre varias instancias. Suficiente para el único
// contenedor Next.js de este despacho — si algún día corre en más de una instancia,
// mover esto a una tabla/Redis compartido.
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const intentosFallidos = new Map<string, { conteo: number; bloqueadoHasta: number }>();

function estaBloqueado(email: string): boolean {
  const estado = intentosFallidos.get(email);
  return !!estado && estado.bloqueadoHasta > Date.now();
}

function registrarIntento(email: string, exito: boolean) {
  if (exito) {
    intentosFallidos.delete(email);
    return;
  }
  const estado = intentosFallidos.get(email) ?? { conteo: 0, bloqueadoHasta: 0 };
  estado.conteo += 1;
  if (estado.conteo >= MAX_INTENTOS) estado.bloqueadoHasta = Date.now() + BLOQUEO_MS;
  intentosFallidos.set(email, estado);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();
        if (estaBloqueado(email)) return null;
        try {
          const u = await prisma.usuario.findUnique({
            where: { email },
            include: { sucursal: true },
          });
          if (!u || !u.activo || !u.passwordHash) {
            registrarIntento(email, false);
            return null;
          }
          const ok = await bcrypt.compare(credentials.password, u.passwordHash);
          if (!ok) {
            registrarIntento(email, false);
            return null;
          }
          registrarIntento(email, true);
          return {
            id: u.id,
            name: u.nombre,
            email: u.email,
            rol: u.rol as Rol,
            sucursal: u.sucursal?.nombre ?? "",
            debeCambiarPassword: u.debeCambiarPassword,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.rol = user.rol;
        token.sucursal = user.sucursal;
        token.debeCambiarPassword = user.debeCambiarPassword;
      }
      if (trigger === "update" && session?.debeCambiarPassword === false) {
        token.debeCambiarPassword = false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.rol = token.rol as Rol;
        session.user.sucursal = token.sucursal as string;
        session.user.debeCambiarPassword = token.debeCambiarPassword as boolean;
      }
      return session;
    },
  },
};
