import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProductividad } from "@/lib/guard";
import { estadisticaCumplimiento, hoyISO, rangoDelPeriodo, type PeriodoEstadistica } from "@/lib/services/productividad";
import type { Conteo } from "@/lib/productividad-regla";
import { PageTitle, Card } from "@/components/ui";

const PERIODOS: { clave: PeriodoEstadistica; label: string }[] = [
  { clave: "semana", label: "Esta semana" },
  { clave: "mes", label: "Este mes" },
  { clave: "todo", label: "Todo" },
];

function Barra({ c }: { c: Conteo }) {
  if (c.total === 0) return <div className="h-2.5 rounded-full bg-line" />;
  const ancho = (n: number) => `${(n / c.total) * 100}%`;
  return (
    <div className="h-2.5 rounded-full bg-line overflow-hidden flex">
      <div className="bg-success" style={{ width: ancho(c.si) }} />
      <div className="bg-danger" style={{ width: ancho(c.no) }} />
      <div className="bg-amber" style={{ width: ancho(c.sinRespuesta) }} />
    </div>
  );
}

function Detalle({ c }: { c: Conteo }) {
  if (c.total === 0) return <span className="text-muted">Sin respuestas</span>;
  return (
    <span className="text-muted">
      <b className="text-success">{c.si}</b> sí · <b className="text-danger">{c.no}</b> no ·{" "}
      <b className="text-amber">{c.sinRespuesta}</b> sin respuesta
    </span>
  );
}

const pct = (c: Conteo) => (c.porcentaje === null ? "—" : `${c.porcentaje}%`);

export default async function EstadisticasProductividadPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  try {
    await requireProductividad();
  } catch {
    redirect("/inicio");
  }

  const periodo = PERIODOS.some((p) => p.clave === searchParams.periodo)
    ? (searchParams.periodo as PeriodoEstadistica)
    : "mes";
  const hoy = hoyISO();
  const grupos = await estadisticaCumplimiento(periodo, hoy);
  const rango = rangoDelPeriodo(periodo, hoy);

  return (
    <>
      <PageTitle
        eyebrow="Coordinación de Operaciones y Sistemas"
        title="Estadísticas de productividad"
        subtitle={
          rango
            ? `Cumplimiento de las encuestas del ${rango.desde} al ${rango.hasta}`
            : "Cumplimiento de las encuestas, desde el inicio"
        }
      />

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {PERIODOS.map((p) => (
          <Link
            key={p.clave}
            href={`/productividad/estadisticas?periodo=${p.clave}`}
            className={`px-3 py-1.5 rounded-md text-[13px] font-bold border transition-colors ${
              p.clave === periodo ? "bg-navy text-white border-navy" : "border-line text-muted hover:border-navy/40"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <p className="text-[12.5px] text-muted mb-4">
        Cumplió = contestó <b>Sí</b>. Un <b>No</b> y un <b>Sin respuesta</b> cuentan como no cumplido.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {grupos.map((g) => (
          <Card key={g.label} className="p-5">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="font-serif text-[18px] text-ink">{g.label}</h3>
              <span className="text-[26px] font-bold num text-ink">{pct(g.conteo)}</span>
            </div>
            <div className="text-[12px] mb-2">
              <Detalle c={g.conteo} />
            </div>
            <Barra c={g.conteo} />

            <div className="mt-4 grid gap-3">
              {g.personas.map((p) => (
                <div key={p.nombre}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px] mb-1">
                    <span className="text-ink font-bold">{p.nombre}</span>
                    <span className="num font-bold">{pct(p.conteo)}</span>
                  </div>
                  <Barra c={p.conteo} />
                  <div className="text-[11.5px] mt-1">
                    <Detalle c={p.conteo} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
