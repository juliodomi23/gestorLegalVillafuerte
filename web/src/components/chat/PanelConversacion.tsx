"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, CircleUserRound, Phone } from "lucide-react";

type Detalle = {
  id: string;
  estado: string;
  nombreContacto: string;
  telefono: string;
  canal: { nombre: string; telefono: string | null; activo: boolean };
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  prospecto: { id: string; nombre: string; telefono: string | null } | null;
  responsable: { id: string; nombre: string } | null;
};

export function PanelConversacion({ conversacionId, version }: { conversacionId: string; version: number }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch(`/api/conversaciones/${conversacionId}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (vigente) setDetalle(data?.conversacion || null);
      });
    return () => { vigente = false; };
  }, [conversacionId, version]);

  if (!detalle) return <p className="p-5 text-[13px] text-muted">Cargando detalles…</p>;
  return (
    <div className="p-5 space-y-5">
      <div className="text-center">
        <span className="mx-auto w-14 h-14 rounded-full bg-navy/[.08] text-navy flex items-center justify-center"><CircleUserRound size={28} /></span>
        <h3 className="font-serif text-[18px] mt-2">{detalle.nombreContacto}</h3>
        <p className="text-[12.5px] text-muted flex items-center justify-center gap-1 mt-1"><Phone size={13} /> {detalle.telefono}</p>
      </div>

      <div className="border-t border-line pt-4 space-y-3 text-[13px]">
        <Fila etiqueta="Estado" valor={detalle.estado} />
        <Fila etiqueta="Canal" valor={`${detalle.canal.nombre}${detalle.canal.activo ? "" : " · inactivo"}`} />
        <Fila etiqueta="Responsable" valor={detalle.responsable?.nombre || "Sin asignar"} />
      </div>

      <div className="border-t border-line pt-4">
        <p className="eyebrow text-muted mb-2">Vinculación por teléfono</p>
        {detalle.cliente ? (
          <Link href={`/clientes/${detalle.cliente.id}`} className="flex items-center gap-2 rounded-lg border border-line p-3 hover:border-navy/40">
            <BriefcaseBusiness size={17} className="text-navy" />
            <span><b className="block text-[13px]">Cliente</b><span className="text-[12px] text-muted">{detalle.cliente.nombre}</span></span>
          </Link>
        ) : detalle.prospecto ? (
          <Link href="/prospectos" className="flex items-center gap-2 rounded-lg border border-line p-3 hover:border-navy/40">
            <CircleUserRound size={17} className="text-amber" />
            <span><b className="block text-[13px]">Prospecto</b><span className="text-[12px] text-muted">{detalle.prospecto.nombre}</span></span>
          </Link>
        ) : (
          <p className="text-[12.5px] text-muted">Sin coincidencia inequívoca en Clientes o Prospectos.</p>
        )}
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted">{etiqueta}</span><b className="text-right">{valor}</b></div>;
}
