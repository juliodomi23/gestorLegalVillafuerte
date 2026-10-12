export type TipoMensaje = "texto" | "imagen" | "audio" | "video" | "documento" | "ubicacion" | "plantilla";

export type MensajeEntranteNormalizado = {
  waMessageId: string;
  telefono: string;
  nombre?: string;
  tipo: TipoMensaje;
  contenido: string;
  timestamp: Date;
  mediaId?: string;
  mediaNombre?: string;
};

export type ActualizacionEstado = {
  waMessageId: string;
  status: "enviado" | "entregado" | "leido" | "fallido";
  error?: string;
};

export type PlantillaMeta = {
  name: string;
  language: string;
  status?: string;
  components?: { type?: string; text?: string; buttons?: { text?: string }[] }[];
};

export type ResultadoEnvio = { ok: boolean; waMessageId?: string; error?: string };

export type ResultadoMedia =
  | { ok: true; buffer: Buffer; mime: string }
  | { ok: false; error: string };

export type ProveedorCanal = {
  enviarTexto: (telefono: string, texto: string) => Promise<ResultadoEnvio>;
  enviarPlantilla: (
    telefono: string,
    plantilla: { name: string; language: string },
    variables: string[],
  ) => Promise<ResultadoEnvio>;
  listarPlantillas: () => Promise<PlantillaMeta[]>;
  descargarMedia: (mediaId: string) => Promise<ResultadoMedia>;
};
