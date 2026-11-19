// Una cita cancelada pasa a "reagendada" cuando el mismo teléfono quedó con otra cita
// viva creada después de ella y antes de que pasara el día de la original. Es lo que
// hace el bot: marca ❌ el evento viejo (sync lo deja "cancelada") y agenda uno nuevo.
// Sin imports, para probarlo con `node --experimental-strip-types`.

export type CitaParaReagendar = {
  id: string;
  estado: string;
  telefono: string | null;
  creadoEn: Date;
  fechaHora: Date;
};

const ultimos10 = (t: string | null) => String(t ?? "").replace(/\D/g, "").slice(-10);
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function idsReagendadas(citas: CitaParaReagendar[]): string[] {
  const vivas = citas.filter((c) => c.estado === "agendada" || c.estado === "confirmada");
  return citas
    .filter((c) => c.estado === "cancelada" && ultimos10(c.telefono).length === 10)
    .filter((c) =>
      vivas.some(
        (v) =>
          v.id !== c.id &&
          ultimos10(v.telefono) === ultimos10(c.telefono) &&
          v.creadoEn > c.creadoEn &&
          v.creadoEn.getTime() <= c.fechaHora.getTime() + UN_DIA_MS
      )
    )
    .map((c) => c.id);
}
