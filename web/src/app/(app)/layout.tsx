import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { puedeVerProductividad } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { name, rol, debeCambiarPassword } = session.user;
  if (debeCambiarPassword) redirect("/cambiar-password");

  const [verProductividad, usuario] = await Promise.all([
    puedeVerProductividad(),
    prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { pin: true, pinGenerado: true },
    }),
  ]);

  return (
    <AppShell
      nombre={name ?? "Usuario"}
      rol={rol}
      verProductividad={verProductividad}
      estadoPin={!usuario?.pin ? "sin_pin" : usuario.pinGenerado ? "generado" : "propio"}
    >
      {children}
    </AppShell>
  );
}
