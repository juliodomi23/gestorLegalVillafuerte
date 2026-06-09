// Datos de ejemplo mientras conectamos la base de datos real (Prisma).
// Sucursales reales del despacho: Tuxtla, San Cristóbal, Tapachula, Villaflores, Comitán.

export type Expediente = {
  id: string;
  numeroInterno: string;
  numeroJudicial: string;
  cliente: string;
  materia: string;
  etapa: string;
  abogado: string;
  sucursal: string;
  estado: "Activo" | "Suspendido" | "Concluido" | "Archivado";
  vencimiento: string | null;
  urgente: boolean;
};

export const expedientes: Expediente[] = [
  { id: "0142", numeroInterno: "EXP-2026-0142", numeroJudicial: "542/2026", cliente: "Juan Pérez", materia: "Mercantil", etapa: "Contestación", abogado: "Christian", sucursal: "Tuxtla", estado: "Activo", vencimiento: "Mañana", urgente: true },
  { id: "0098", numeroInterno: "EXP-2026-0098", numeroJudicial: "311/2026", cliente: "Inmobiliaria SA", materia: "Civil", etapa: "Pruebas", abogado: "Ana", sucursal: "Tuxtla", estado: "Activo", vencimiento: "2 días", urgente: true },
  { id: "0051", numeroInterno: "EXP-2026-0051", numeroJudicial: "120/2026", cliente: "María López", materia: "Familiar", etapa: "Alegatos", abogado: "Christian", sucursal: "San Cristóbal", estado: "Activo", vencimiento: "4 días", urgente: false },
  { id: "0077", numeroInterno: "EXP-2026-0077", numeroJudicial: "205/2026", cliente: "Constructora del Sur", materia: "Mercantil", etapa: "Sentencia", abogado: "Ana", sucursal: "Tapachula", estado: "Activo", vencimiento: null, urgente: false },
  { id: "0410", numeroInterno: "EXP-2025-0410", numeroJudicial: "889/2025", cliente: "Pedro Ramírez", materia: "Laboral", etapa: "Ejecución", abogado: "Christian", sucursal: "Comitán", estado: "Suspendido", vencimiento: null, urgente: false },
  { id: "0123", numeroInterno: "EXP-2026-0123", numeroJudicial: "478/2026", cliente: "Rosa Gutiérrez", materia: "Familiar", etapa: "Demanda", abogado: "Ana", sucursal: "Villaflores", estado: "Activo", vencimiento: "6 días", urgente: false },
];

export type Cliente = {
  nombre: string;
  tipo: "Física" | "Moral";
  telefono: string;
  expedientes: number;
  ultimaAsesoria: string | null;
};

export const clientes: Cliente[] = [
  { nombre: "Juan Pérez", tipo: "Física", telefono: "961 123 4567", expedientes: 2, ultimaAsesoria: "07/06/2026" },
  { nombre: "Inmobiliaria SA", tipo: "Moral", telefono: "961 987 6543", expedientes: 3, ultimaAsesoria: "01/06/2026" },
  { nombre: "María López", tipo: "Física", telefono: "961 555 1212", expedientes: 1, ultimaAsesoria: "28/05/2026" },
  { nombre: "Constructora del Sur", tipo: "Moral", telefono: "961 444 2020", expedientes: 1, ultimaAsesoria: null },
];

export type Movimiento = {
  fecha: string;
  sucursal: string;
  concepto: string;
  expediente: string | null;
  tipo: "Ingreso" | "Egreso";
  monto: string;
  origen: "WhatsApp" | "Web";
};

export const movimientos: Movimiento[] = [
  { fecha: "09/06", sucursal: "Tuxtla", concepto: "Corte de caja", expediente: null, tipo: "Ingreso", monto: "$4,500", origen: "WhatsApp" },
  { fecha: "02/06", sucursal: "Tuxtla", concepto: "Anticipo honorarios", expediente: "EXP-0142", tipo: "Ingreso", monto: "$8,000", origen: "Web" },
  { fecha: "05/06", sucursal: "Tuxtla", concepto: "Gastos emplazamiento", expediente: "EXP-0142", tipo: "Egreso", monto: "$650", origen: "WhatsApp" },
];

export const SUCURSALES = ["Tuxtla", "San Cristóbal", "Tapachula", "Villaflores", "Comitán"];
export const MATERIAS = ["Civil", "Mercantil", "Penal", "Familiar", "Laboral", "Amparo", "Administrativo"];
export const ABOGADOS = ["Christian", "Ana"];
export const ETAPAS = ["Demanda", "Contestación", "Pruebas", "Alegatos", "Sentencia", "Ejecución"];

export type StatusAsesoria = "pendiente" | "contrato_firmado" | "no_regreso" | "descartado";

export type Asesoria = {
  fecha: string;
  nombre: string;
  telefono: string;
  asunto: string;
  sucursal: string;
  abogado: string;
  pago: boolean;
  monto: string;
  status: StatusAsesoria;
  url_doc?: string;
};

export const asesorias: Asesoria[] = [
  { fecha: "07/06/2026", nombre: "Laura Méndez", telefono: "961 111 2233", asunto: "Divorcio", sucursal: "Tuxtla", abogado: "Ana", pago: true, monto: "$500", status: "contrato_firmado" },
  { fecha: "06/06/2026", nombre: "José Hernández", telefono: "961 444 5566", asunto: "Despido injustificado", sucursal: "Tapachula", abogado: "Christian", pago: true, monto: "$500", status: "pendiente" },
  { fecha: "05/06/2026", nombre: "Carmen Ruiz", telefono: "961 777 8899", asunto: "Pagaré", sucursal: "Tuxtla", abogado: "Ana", pago: false, monto: "—", status: "no_regreso" },
  { fecha: "04/06/2026", nombre: "Miguel Torres", telefono: "961 222 3344", asunto: "Pensión alimenticia", sucursal: "San Cristóbal", abogado: "Christian", pago: true, monto: "$500", status: "pendiente" },
  { fecha: "02/06/2026", nombre: "Sofía Aguilar", telefono: "961 555 6677", asunto: "Arrendamiento", sucursal: "Comitán", abogado: "Ana", pago: false, monto: "—", status: "descartado" },
];

export type Seguimiento = {
  cliente: string;
  tipoCaso: string;
  abogado: string;
  sucursal: string;
  telefono: string;
  ultimoContacto: string;
  proximoLlamado: string;
  frecuencia: number;
  estado: "Activo" | "Suspendido" | "Cerrado";
  alerta: "hoy" | "atrasado" | null;
};

export const seguimientos: Seguimiento[] = [
  { cliente: "Laura Méndez", tipoCaso: "Divorcio", abogado: "Ana", sucursal: "Tuxtla", telefono: "961 111 2233", ultimoContacto: "02/06/2026", proximoLlamado: "09/06/2026", frecuencia: 7, estado: "Activo", alerta: "hoy" },
  { cliente: "Miguel Torres", tipoCaso: "Pensión", abogado: "Christian", sucursal: "San Cristóbal", telefono: "961 222 3344", ultimoContacto: "26/05/2026", proximoLlamado: "05/06/2026", frecuencia: 10, estado: "Activo", alerta: "atrasado" },
  { cliente: "Juan Pérez", tipoCaso: "Mercantil", abogado: "Christian", sucursal: "Tuxtla", telefono: "961 123 4567", ultimoContacto: "07/06/2026", proximoLlamado: "14/06/2026", frecuencia: 7, estado: "Activo", alerta: null },
  { cliente: "Constructora del Sur", tipoCaso: "Mercantil", abogado: "Ana", sucursal: "Tapachula", telefono: "961 444 2020", ultimoContacto: "01/06/2026", proximoLlamado: "16/06/2026", frecuencia: 15, estado: "Activo", alerta: null },
];
