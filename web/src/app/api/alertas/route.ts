import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { alcanceDe } from "@/lib/alcance";
import { alertasDe } from "@/lib/services/alertas";

// Las alertas de quien está viendo, para la campana del topbar.
// Se calculan al vuelo: no hay tabla de notificaciones que se quede desactualizada.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const alcance = await alcanceDe(session.user.id, session.user.rol);
  const alertas = await alertasDe(session.user.id, session.user.rol, alcance);
  return Response.json({ total: alertas.length, alertas });
}
