import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { alcanceDe } from "@/lib/alcance";
import { listarContratos, expedientesParaContrato } from "@/lib/services/contratos";
import ContratosClient from "./client";

export default async function ContratosPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  const [contratos, expedientes] = await Promise.all([
    listarContratos(alcance),
    expedientesParaContrato(alcance),
  ]);

  return <ContratosClient contratos={contratos} expedientes={expedientes} />;
}
