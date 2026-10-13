import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { puedeVerProductividad, puedeVerReportes } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { chatWhatsappActivo } from "@/lib/chat/modulo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { name, rol, debeCambiarPassword } = session.user;
  if (debeCambiarPassword) redirect("/cambiar-password");

  const [verProductividad, verReportes, usuario] = await Promise.all([
    puedeVerProductividad(),
    puedeVerReportes(),
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
      verReportes={verReportes}
      chatWhatsappActivo={chatWhatsappActivo()}
      estadoPin={!usuario?.pin ? "sin_pin" : usuario.pinGenerado ? "generado" : "propio"}
    >
      {children}
    </AppShell>
  );
}
