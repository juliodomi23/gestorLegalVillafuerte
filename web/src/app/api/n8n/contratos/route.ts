import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { crearExpediente } from "@/lib/services/expedientes";
import { guardarPlanPago } from "@/lib/services/contratos";

// El bot manda un contrato leído de WhatsApp: crea cliente + expediente (uno
// nuevo por contrato, igual que si se diera de alta a mano) con el PDF ya
// ligado, y si trae monto registra el plan de pago "todo al inicio" -- queda
// disponible para que un abogado lo afine desde /contratos.
type DatosContrato = {
  cliente: string;
  telefonoCliente?: string;
  abogado?: string;
  sucursal?: string;
  materia?: string;
  nombreArchivo: string;
  linkDrive: string;
  monto?: number;
  notas?: string;
};

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosContrato>(req, ["cliente", "nombreArchivo", "linkDrive"]);
  if ("error" in r) return r.error;
  const d = r.data;

  try {
    const exp = await crearExpediente({
      cliente: d.cliente,
      telefonoCliente: d.telefonoCliente,
      materia: d.materia || "Otros",
      abogado: d.abogado,
      sucursal: d.sucursal,
      documento: { nombre: d.nombreArchivo, linkDrive: d.linkDrive, tipo: "contrato" },
    });

    let planCreado = false;
    const monto = Number(d.monto);
    if (Number.isFinite(monto) && monto > 0) {
      await guardarPlanPago({
        expedienteId: exp.id,
        tipo: "todo_inicio",
        montoTotal: monto,
        notas: d.notas || "Registrado automáticamente por el asistente de WhatsApp.",
      });
      planCreado = true;
    }

    return ok({ expedienteId: exp.id, numeroInterno: exp.numeroInterno, planCreado }, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
