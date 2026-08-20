import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolverSucursalPorSlug, siguienteTipo } from "@/lib/checador";
import CheckarClient from "./client";

export default async function CheckarPage({ params }: { params: { sucursal: string } }) {
  const sucursal = await resolverSucursalPorSlug(params.sucursal);

  if (!sucursal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
        <div className="max-w-sm text-center">
          <p className="eyebrow text-danger">Reloj checador</p>
          <h1 className="font-serif text-[22px] text-ink mt-1">Sucursal no encontrada</h1>
          <p className="text-muted text-[14px] mt-2">Revisa la etiqueta o pídele la URL correcta a tu administrador.</p>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  const sesion =
    session?.user?.id
      ? { nombre: session.user.name ?? "", tipoSugerido: await siguienteTipo(session.user.id) }
      : null;

  return (
    <CheckarClient
      sucursalSlug={params.sucursal}
      sucursalNombre={sucursal.nombre}
      sesion={sesion}
      geocerca={
        sucursal.lat != null && sucursal.lon != null
          ? { lat: sucursal.lat, lon: sucursal.lon, radioM: sucursal.radioM }
          : null
      }
    />
  );
}
