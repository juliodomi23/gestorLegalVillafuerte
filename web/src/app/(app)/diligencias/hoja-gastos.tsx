"use client";

import { Hoja } from "@/components/hoja";
import type { DiligenciaView } from "./client";

function fechaCorta(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return y && m && d ? `${d}/${m}/${y}` : fecha;
}

export default function HojaGastos({
  diligencia,
  onClose,
}: {
  diligencia: DiligenciaView | null;
  onClose: () => void;
}) {
  const total = diligencia?.renglones.reduce((suma, renglon) => suma + renglon.importe, 0) ?? 0;

  return (
    <Hoja
      open={!!diligencia}
      onClose={onClose}
      titulo="Factura · Hoja de gastos"
      folio={diligencia?.folio}
      fecha={diligencia?.fecha ?? ""}
      sucursal={diligencia?.sucursal}
      pie={
        <span className="block border-t border-line/80 pt-1.5 max-w-[300px]">
          Abogado: {diligencia?.abogado || "—"}
        </span>
      }
    >
      <section className="col-span-12 border border-line">
        <div className="grid grid-cols-12 border-b border-line text-[13px]">
          <div className="col-span-3 bg-paper/70 px-3 py-2 eyebrow text-muted">Abogado</div>
          <div className="col-span-6 px-3 py-2 font-bold">{diligencia?.abogado || "—"}</div>
          <div className="col-span-3 px-3 py-2 border-l border-line text-right">
            <span className="eyebrow text-muted mr-2">Fecha</span>
            <span className="num">{diligencia?.fecha || "—"}</span>
          </div>
        </div>
        <div className="grid grid-cols-12 text-[13px]">
          <div className="col-span-3 bg-paper/70 px-3 py-2 eyebrow text-muted">Cliente</div>
          <div className="col-span-9 px-3 py-2 font-bold">{diligencia?.cliente || "—"}</div>
        </div>
      </section>

      <section className="col-span-12 mt-8">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-navy text-white">
              <th className="px-3 py-2.5 text-left w-[105px]">Fecha</th>
              <th className="px-3 py-2.5 text-left">Descripción</th>
              <th className="px-3 py-2.5 text-left">Asunto</th>
              <th className="px-3 py-2.5 text-right w-[115px]">Importe</th>
            </tr>
          </thead>
          <tbody>
            {diligencia?.renglones.map((renglon) => (
              <tr key={renglon.id} className="border-x border-b border-line align-top">
                <td className="px-3 py-3 num text-muted">{fechaCorta(renglon.fecha)}</td>
                <td className="px-3 py-3">{renglon.descripcion || "—"}</td>
                <td className="px-3 py-3 text-muted">{renglon.asunto || "—"}</td>
                <td className="px-3 py-3 num text-right font-bold">
                  ${renglon.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {diligencia?.renglones.length === 0 && (
              <tr className="border-x border-b border-line">
                <td colSpan={4} className="px-3 py-10 text-center text-muted">Sin conceptos registrados.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} />
              <th className="bg-paper border-x border-b border-line px-3 py-2 text-right uppercase tracking-wide text-[11px]">Subtotal</th>
              <td className="border-r border-b border-line px-3 py-2 num text-right font-bold">
                ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td colSpan={2} />
              <th className="bg-navy text-white border-x border-b border-navy px-3 py-2.5 text-right uppercase tracking-wide text-[11px]">Total</th>
              <td className="border-r border-b border-navy px-3 py-2.5 num text-right text-[15px] font-bold">
                ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="col-span-12 mt-3 text-[11.5px] text-muted">
        {diligencia?.comprobantes.length
          ? `${diligencia.comprobantes.length} comprobante(s) adjunto(s) en GestorLegal.`
          : "Sin comprobantes adjuntos."}
      </div>
    </Hoja>
  );
}
