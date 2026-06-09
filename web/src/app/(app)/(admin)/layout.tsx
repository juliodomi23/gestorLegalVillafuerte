import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Solo el admin puede entrar a estas rutas (Caja, Configuración),
// incluso escribiendo la URL directamente.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.rol !== "admin") redirect("/inicio");
  return <>{children}</>;
}
