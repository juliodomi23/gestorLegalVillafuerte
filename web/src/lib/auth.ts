import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@/lib/usuarios";

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
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] sin credenciales");
            return null;
          }
          const u = await prisma.usuario.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { sucursal: true },
          });
          console.log("[AUTH] usuario encontrado:", u ? `${u.email} activo=${u.activo} tieneHash=${!!u.passwordHash}` : "NO ENCONTRADO");
          if (!u || !u.activo || !u.passwordHash) return null;
          const ok = await bcrypt.compare(credentials.password, u.passwordHash);
          console.log("[AUTH] bcrypt ok:", ok);
          if (!ok) return null;
          return {
            id: u.id,
            name: u.nombre,
            email: u.email,
            rol: u.rol as Rol,
            sucursal: u.sucursal?.nombre ?? "",
          };
        } catch (e) {
          console.error("[AUTH] error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.sucursal = user.sucursal;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.rol = token.rol as Rol;
        session.user.sucursal = token.sucursal as string;
      }
      return session;
    },
  },
};
