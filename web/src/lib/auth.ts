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
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const u = await prisma.usuario.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { sucursal: true },
          });
          if (!u || !u.activo || !u.passwordHash) return null;
          const ok = await bcrypt.compare(credentials.password, u.passwordHash);
          if (!ok) return null;
          return {
            id: u.id,
            name: u.nombre,
            email: u.email,
            rol: u.rol as Rol,
            sucursal: u.sucursal?.nombre ?? "",
          };
        } catch {
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
        session.user.id = token.sub!;
        session.user.rol = token.rol as Rol;
        session.user.sucursal = token.sucursal as string;
      }
      return session;
    },
  },
};
