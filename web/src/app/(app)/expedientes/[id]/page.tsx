import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ArrowLeft, AlarmClock } from "lucide-react";
import { Card } from "@/components/ui";
import { ExpedienteTabs, type ActuacionData, type AudienciaData, type DocumentoData, type MovimientoTabData, type ParteData } from "@/components/expediente-tabs";
import { EstadoEditor } from "@/components/estado-editor";
import { DocumentosBtn } from "@/components/documentos-btn";
import { ExpedienteAcciones } from "@/components/expediente-acciones";
import { prisma } from "@/lib/prisma";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function diasHasta(d: Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function ExpedienteDetallePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";
  const usuarioId = session?.user?.id ?? "";

  const [exp, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.expediente.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        abogadoResponsable: true,
        sucursal: true,
        terminos: {
          where: { cumplido: false },
          orderBy: { vencimientoTermino: "asc" },
          take: 1,
        },
        actuaciones: {
          orderBy: { creadoEn: "desc" },
          include: { usuario: true },
        },
        partes: true,
        audiencias: { orderBy: { fechaHora: "desc" } },
        documentos: { orderBy: { creadoEn: "desc" } },
        movimientos: { orderBy: { fecha: "desc" } },
      },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  if (!exp) notFound();

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  const terminoActivo = exp.terminos[0] ?? null;
  const diasTermino = terminoActivo?.vencimientoTermino ? diasHasta(terminoActivo.vencimientoTermino) : null;

  const meta = [
    { k: "Cliente",           v: exp.cliente?.nombre ?? "—"                                                    },
    { k: "Rol",               v: exp.rolCliente ?? "—"                                                         },
    { k: "Cuantía",           v: exp.cuantia ? `$${Number(exp.cuantia).toLocaleString("es-MX")}` : "—", num: true },
    { k: "Etapa procesal",    v: exp.etapaProcesal ?? "—"                                                       },
    { k: "Abogado",           v: exp.abogadoResponsable?.nombre ? `Lic. ${exp.abogadoResponsable.nombre}` : "—" },
    { k: "Sucursal",          v: exp.sucursal?.nombre ?? "—"                                                    },
    { k: "Inicio",            v: fmtDate(exp.fechaInicio)                                                       },
    { k: "Última actuación",  v: exp.actuaciones[0]?.fecha ? fmtDate(exp.actuaciones[0].fecha) : "—"           },
  ];

  const actuacionesData: ActuacionData[] = exp.actuaciones.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    descripcion: a.descripcion,
    fecha: fmtDate(a.fecha),
    registradoPor: a.usuario?.nombre ?? null,
    origen: a.origen,
  }));

  const partesData: ParteData[] = exp.partes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    rol: p.rol,
    contacto: p.contacto,
  }));

  const audienciasData: AudienciaData[] = exp.audiencias.map((a) => ({
    id: a.id,
    fechaHora: fmtDateTime(a.fechaHora),
    tipo: a.tipo,
    lugar: a.lugar,
    estado: a.estado,
  }));

  const documentosData: DocumentoData[] = exp.documentos.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    linkDrive: d.linkDrive,
    fecha: d.creadoEn.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }),
  }));

  const movimientosData: MovimientoTabData[] = exp.movimientos.map((m) => ({
    id: m.id,
    fecha: fmtDate(m.fecha),
    concepto: m.concepto,
    tipo: m.tipo,
    monto: Number(m.monto),
  }));

  return (
    <>
      <Link href="/expedientes" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-navy transition-colors mb-4">
        <ArrowLeft size={16} /> Expedientes
      </Link>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-line">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="exp-no text-[26px] font-semibold text-ink">{exp.numeroInterno ?? "S/N"}</h1>
                <EstadoEditor
                  expedienteId={exp.id}
                  estadoInicial={exp.estado}
                  notaInicial={exp.resumen ?? null}
                />
              </div>
              <p className="text-muted text-[14px] mt-1">
                {exp.tipoJuicio ?? "Juicio"} · Materia {exp.materia ?? "—"}
                {exp.numeroJudicial ? <> · N.º de juicio <span className="exp-no">{exp.numeroJudicial}</span></> : ""}
                {exp.juzgado ? ` · ${exp.juzgado}` : ""}
              </p>
              {exp.resumen && (
                <p className="text-[13px] text-amber font-bold mt-1.5">{exp.resumen}</p>
              )}
            </div>
            <div className="flex gap-2">
              <DocumentosBtn
                documentos={exp.documentos
                  .filter((d) => d.linkDrive)
                  .map((d) => ({ id: d.id, nombre: d.nombre, linkDrive: d.linkDrive! }))}
              />
              <ExpedienteAcciones
                expedienteId={exp.id}
                usuarioId={usuarioId}
                esAdmin={esAdmin}
                inicial={{
                  clienteId: exp.clienteId ?? "",
                  clienteNombre: exp.cliente?.nombre ?? "",
                  numeroJudicial: exp.numeroJudicial ?? "",
                  materia: exp.materia ?? "",
                  etapa: exp.etapaProcesal ?? "",
                  abogado: exp.abogadoResponsable?.nombre ?? "",
                  sucursal: exp.sucursal?.nombre ?? "",
                }}
                sucursales={sucursales}
                abogados={abogados}
              />
            </div>
          </div>

          {terminoActivo && diasTermino !== null && (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger-wash/50 px-4 py-3 flex items-center gap-4">
              <AlarmClock size={18} strokeWidth={1.75} className="text-danger" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-danger">Término vigente: {terminoActivo.descripcion ?? "Término procesal"}</p>
                <p className="text-[12px] text-muted">
                  {terminoActivo.fechaAcuerdo ? `Acuerdo ${fmtDate(terminoActivo.fechaAcuerdo)}` : ""}
                  {terminoActivo.diasParaContestar ? ` · ${terminoActivo.diasParaContestar} días` : ""}
                  {terminoActivo.inicioTermino ? ` · Inicia ${fmtDate(terminoActivo.inicioTermino)}` : ""}
                  {terminoActivo.vencimientoTermino ? <> · <b className="text-ink">Vence {fmtDate(terminoActivo.vencimientoTermino)}</b></> : ""}
                </p>
              </div>
              <span className="num text-[26px] font-semibold text-danger">
                {diasTermino < 0 ? "¡Venció!" : diasTermino === 0 ? "¡Hoy!" : <>{diasTermino}<span className="text-[14px] font-sans font-normal"> {diasTermino === 1 ? "día" : "días"}</span></>}
              </span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-y-4 gap-x-8 mt-5">
            {meta.map((m) => (
              <div key={m.k}>
                <p className="eyebrow text-muted">{m.k}</p>
                <p className={`text-[14px] font-bold text-ink mt-1 ${m.num ? "num" : ""}`}>{m.v}</p>
              </div>
            ))}
          </div>
        </div>

        <ExpedienteTabs
          expedienteId={exp.id}
          actuaciones={actuacionesData}
          partes={partesData}
          audiencias={audienciasData}
          documentos={documentosData}
          movimientos={movimientosData}
        />
      </Card>
    </>
  );
}
