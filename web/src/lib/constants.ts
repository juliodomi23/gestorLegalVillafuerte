export const MATERIAS = ["Civil", "Mercantil", "Penal", "Familiar", "Laboral", "Amparo", "Administrativo"];
export const ETAPAS   = ["Demanda", "Contestación", "Pruebas", "Alegatos", "Sentencia", "Ejecución"];
export const ESTADOS_EXP = ["Activo", "Suspendido", "Concluido", "Archivado"];
export const STATUS_ASESORIA = ["pendiente", "contrato_firmado", "no_regreso", "descartado"] as const;
export type StatusAsesoria = typeof STATUS_ASESORIA[number];
