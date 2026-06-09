import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { name, rol } = session.user;

  return (
    <AppShell nombre={name ?? "Usuario"} rol={rol}>
      {children}
    </AppShell>
  );
}
