import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { validarCredenciales, type Rol } from "@/lib/usuarios";

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
      authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const u = validarCredenciales(credentials.email, credentials.password);
        if (!u) return null;
        return { id: u.id, name: u.nombre, email: u.email, rol: u.rol, sucursal: u.sucursal };
      },
    }),
  ],
  callbacks: {
    // Pasamos rol y sucursal al token y a la sesión
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
