// Importa el historial de WhatsApp de Chatwoot a GestorLegal. En Chatwoot solo lee.
// Se puede repetir: lo ya importado se omite y solo entra lo nuevo.
//
//   CW_TOKEN=... node scripts/importar-chatwoot.mjs --solo-lectura          (cuenta, no escribe)
//   CW_TOKEN=... node scripts/importar-chatwoot.mjs --limite 50             (las 50 más recientes)
//   CW_TOKEN=... node scripts/importar-chatwoot.mjs                         (todo)
//
// Variables: CW_TOKEN (obligatoria), CW_URL, CW_ACCOUNT (1), CW_INBOX (1), DATABASE_URL.
// No imprime nombres, teléfonos ni contenido: solo conteos.
import { pathToFileURL } from "node:url";

// ---- reglas puras (con prueba en tests/chat-importador-unit.test.mjs) ----

export function digitosTelefono(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

// Igual que src/lib/chat/telefono.ts
export function claveTelefono(valor) {
  const d = digitosTelefono(valor);
  return d.startsWith("52") ? d.slice(-10) : d;
}

export function telefonoCanonico(valor) {
  const d = digitosTelefono(valor);
  return d.startsWith("52") ? `52${claveTelefono(d)}` : d;
}

const esMexicano = (d) => /^(52|521)\d{10}$/.test(d) || /^\d{10}$/.test(d);
export const e164 = (valor) => {
  const d = digitosTelefono(valor);
  if (!d) return "";
  return esMexicano(d) ? `+521${d.slice(-10)}` : `+${d}`;
};
export const sourceId = (valor) => {
  const d = digitosTelefono(valor);
  if (!d) return "";
  return esMexicano(d) ? `521${d.slice(-10)}` : d;
};

// pending en Chatwoot es "lo atiende el bot": aquí entra como abierta para no inundar "Por atender".
export function estadoDe(status) {
  return status === "resolved" ? "cerrada" : "abierta";
}

// De más a menos fuerte: un no-show o una cancelación pesan más que la cita que los precedió.
const ETAPA_POR_ETIQUETA = [
  ["no_asistio", "no_asistio"],
  ["cita_cancelada", "contactado"],
  ["cita_confirmada", "agendo_cita"],
  ["cita_agendada", "agendo_cita"],
  ["llamada_agendada", "agendo_llamada"],
];

export function etapaDe(etiquetas) {
  const tiene = new Set((etiquetas || []).map((e) => String(e).toLowerCase()));
  return ETAPA_POR_ETIQUETA.find(([etiqueta]) => tiene.has(etiqueta))?.[1] ?? "nuevo";
}

const STATUS = { sent: "enviado", delivered: "entregado", read: "leido", failed: "fallido" };
const ADJUNTO = { image: "imagen", audio: "audio", video: "video", file: "documento", location: "ubicacion" };

// Devuelve null para las actividades del sistema (asignaciones, cambios de estado…).
export function filaMensaje(m, conversacionId, usuarioPorAgente = new Map()) {
  if (m.message_type !== 0 && m.message_type !== 1 && m.message_type !== 3) return null;
  const adjuntos = Array.isArray(m.attachments) ? m.attachments : [];
  const contenido = m.content ?? (adjuntos.length
    ? `[${ADJUNTO[adjuntos[0].file_type] || "archivo"} — adjunto no importado]`
    : "");
  const source = typeof m.source_id === "string" && m.source_id.startsWith("wamid") ? m.source_id : null;
  return {
    id: m.id,
    conversacionId,
    direccion: m.message_type === 0 ? "entrante" : "saliente",
    contenido: contenido || "",
    status: STATUS[m.status] || "enviado",
    waMessageId: source,
    enviadoPor: m.message_type !== 0 && m.sender?.type === "user" ? usuarioPorAgente.get(m.sender.id) ?? null : null,
    privado: Boolean(m.private),
    timestamp: new Date((m.created_at || 0) * 1000),
  };
}

// Chatwoot permite varias conversaciones por contacto; aquí hay una por teléfono.
// La más reciente conserva su ID y las demás se leen por teléfono (así lo resuelve la app).
export function agruparPorTelefono(conversaciones) {
  const grupos = new Map();
  for (const c of conversaciones) {
    const clave = claveTelefono(c.meta?.sender?.phone_number);
    if (!clave) continue;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(c);
  }
  return [...grupos.entries()]
    .map(([clave, convs]) => ({
      clave,
      convs: convs.sort((a, b) => (b.last_activity_at || 0) - (a.last_activity_at || 0)),
    }))
    .sort((a, b) => (b.convs[0].last_activity_at || 0) - (a.convs[0].last_activity_at || 0));
}

// ---- ejecución ----

const LIMITE_ID = 1_000_000; // la secuencia propia arranca ahí; por debajo van los IDs de Chatwoot
const idCompat = (id) => (Number.isInteger(id) && id > 0 && id < LIMITE_ID ? BigInt(id) : undefined);

function argumentos(argv) {
  const a = { soloLectura: false, limite: 0, concurrencia: 3 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--solo-lectura") a.soloLectura = true;
    else if (argv[i] === "--limite") a.limite = Number(argv[++i]) || 0;
    else if (argv[i] === "--concurrencia") a.concurrencia = Math.max(1, Math.min(6, Number(argv[++i]) || 3));
  }
  return a;
}

function clienteChatwoot({ url, token, cuenta }) {
  const base = `${url.replace(/\/+$/, "")}/api/v1/accounts/${cuenta}`;
  return async function get(ruta, params) {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    for (let intento = 1; ; intento++) {
      try {
        const r = await fetch(`${base}${ruta}${qs}`, {
          headers: { api_access_token: token, "user-agent": "importador-gestorlegal/1" },
          signal: AbortSignal.timeout(40_000),
        });
        if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
        if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} en ${ruta}`), { fatal: true });
        return await r.json();
      } catch (e) {
        if (e.fatal || intento >= 4) throw e;
        await new Promise((ok) => setTimeout(ok, 1500 * intento));
      }
    }
  };
}

async function pool(items, concurrencia, trabajo) {
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrencia, items.length) }, async () => {
      while (siguiente < items.length) await trabajo(items[siguiente++]);
    }),
  );
}

async function main() {
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const args = argumentos(process.argv.slice(2));
  const token = process.env.CW_TOKEN;
  if (!token) throw new Error("Falta CW_TOKEN");
  const cuenta = process.env.CW_ACCOUNT || "1";
  const inboxId = Number(process.env.CW_INBOX || 1);
  const get = clienteChatwoot({ url: process.env.CW_URL || "https://chat.ambarrojo.cloud", token, cuenta });
  const prisma = new PrismaClient();
  const r = { conversaciones: 0, sinTelefono: 0, telefonos: 0, unidas: 0, nuevas: 0, omitidas: 0, conErrores: 0, mensajes: 0, etapas: {}, etiquetas: 0 };

  try {
    const inbox = (await get("/inboxes")).payload.find((i) => i.id === inboxId);
    if (!inbox || inbox.channel_type !== "Channel::Whatsapp") throw new Error(`El inbox ${inboxId} no es WhatsApp`);
    const cfg = inbox.provider_config || {};
    if (!cfg.phone_number_id || !cfg.business_account_id) throw new Error("El token no ve phone_number_id/business_account_id (¿es administrador?)");

    const agentes = await get("/agents");
    const correoPorAgente = new Map(agentes.filter((a) => a.email).map((a) => [a.id, a.email.toLowerCase()]));
    const usuarios = args.soloLectura ? [] : await prisma.usuario.findMany({ where: { email: { not: null } }, select: { id: true, email: true } });
    const usuarioPorCorreo = new Map(usuarios.map((u) => [u.email.toLowerCase(), u.id]));
    const usuarioPorAgente = new Map([...correoPorAgente].filter(([, c]) => usuarioPorCorreo.has(c)).map(([id, c]) => [id, usuarioPorCorreo.get(c)]));

    // Conversaciones del inbox, de la más reciente a la más antigua.
    const todas = [];
    for (let pagina = 1; ; pagina++) {
      const d = await get("/conversations", { status: "all", inbox_id: String(inboxId), assignee_type: "all", page: String(pagina) });
      const lote = d.data?.payload || [];
      if (!lote.length) break;
      todas.push(...lote);
    }
    r.conversaciones = todas.length;
    r.sinTelefono = todas.filter((c) => !claveTelefono(c.meta?.sender?.phone_number)).length;
    let grupos = agruparPorTelefono(todas);
    r.telefonos = grupos.length;
    r.unidas = grupos.filter((g) => g.convs.length > 1).length;
    if (args.limite) grupos = grupos.slice(0, args.limite);
    for (const g of grupos) {
      const e = etapaDe(g.convs.flatMap((c) => c.labels || []));
      r.etapas[e] = (r.etapas[e] || 0) + 1;
    }
    r.etiquetas = new Set(grupos.flatMap((g) => g.convs.flatMap((c) => c.labels || []))).size;

    if (args.soloLectura) {
      console.log(JSON.stringify({ modo: "solo-lectura", ...r, aImportar: grupos.length }, null, 2));
      return;
    }

    const canal =
      (await prisma.canalWhatsapp.findUnique({ where: { phoneNumberId: String(cfg.phone_number_id) } })) ||
      (await prisma.canalWhatsapp.create({
        data: {
          nombre: inbox.name || "WhatsApp",
          telefono: inbox.phone_number || null,
          phoneNumberId: String(cfg.phone_number_id),
          wabaId: String(cfg.business_account_id),
          estado: "desconectado",
          numeroCompat: BigInt(inboxId), // el bot sigue mandando el mismo inbox_id que en Chatwoot
        },
      }));
    const etapaPorClave = new Map((await prisma.embudoEtapa.findMany({ where: { clave: { not: null } } })).map((e) => [e.clave, e.id]));

    const [clientes, prospectos] = await Promise.all([
      prisma.cliente.findMany({ where: { telefono: { not: null } }, select: { id: true, telefono: true } }),
      prisma.prospecto.findMany({ select: { id: true, telefono: true, conversationId: true } }),
    ]);
    const porClave = new Map();
    const agregar = (clave, tipo, id) => porClave.set(clave, [...(porClave.get(clave) || []), { tipo, id }]);
    clientes.forEach((c) => agregar(claveTelefono(c.telefono), "cliente", c.id));
    prospectos.filter((p) => p.telefono).forEach((p) => agregar(claveTelefono(p.telefono), "prospecto", p.id));
    const prospectoPorConversacion = new Map(prospectos.filter((p) => p.conversationId).map((p) => [String(p.conversationId), p.id]));

    const etiquetaId = new Map();
    async function asegurarEtiqueta(nombre) {
      if (!etiquetaId.has(nombre)) {
        const e = await prisma.etiquetaChat.upsert({ where: { nombre }, update: {}, create: { nombre } });
        etiquetaId.set(nombre, e.id);
      }
      return etiquetaId.get(nombre);
    }

    async function mensajesDe(conversacionId) {
      const todos = [];
      let antes = null;
      for (;;) {
        const d = await get(`/conversations/${conversacionId}/messages`, antes ? { before: String(antes) } : undefined);
        const lote = d.payload || [];
        if (!lote.length) break;
        todos.push(...lote);
        antes = Math.min(...lote.map((m) => m.id));
        if (lote.length < 20) break;
      }
      return todos;
    }

    async function importar(grupo) {
      const principal = grupo.convs[0];
      const existente = await prisma.conversacion.findUnique({
        where: { canalId_telefonoNormalizado: { canalId: canal.id, telefonoNormalizado: grupo.clave } },
      });
      if (existente?.ultimoMensajeAt && (principal.last_activity_at || 0) * 1000 <= existente.ultimoMensajeAt.getTime()) {
        r.omitidas++;
        return;
      }
      const vistos = new Map();
      for (const c of grupo.convs) for (const m of await mensajesDe(c.id)) vistos.set(m.id, { m, conv: c.id });

      let conversacion = existente;
      if (!conversacion) {
        const remitente = principal.meta?.sender || {};
        const telefono = telefonoCanonico(remitente.phone_number);
        const nombre = (remitente.name || "").trim() || telefono;
        let contacto = await prisma.contactoWhatsapp.findUnique({
          where: { canalId_telefonoNormalizado: { canalId: canal.id, telefonoNormalizado: grupo.clave } },
        });
        if (!contacto) {
          const datos = {
            canalId: canal.id,
            nombre,
            telefono: e164(remitente.phone_number),
            telefonoNormalizado: grupo.clave,
            sourceId: sourceId(remitente.phone_number),
            creadoEn: new Date((principal.created_at || 0) * 1000),
          };
          try {
            contacto = await prisma.contactoWhatsapp.create({ data: { ...datos, numeroCompat: idCompat(remitente.id) } });
          } catch (e) {
            if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
            contacto = await prisma.contactoWhatsapp.create({ data: datos });
          }
        }
        const coincidencias = porClave.get(grupo.clave) || [];
        let vinculo = { clienteId: null, prospectoId: null };
        if (coincidencias.length === 1) {
          vinculo = coincidencias[0].tipo === "cliente" ? { clienteId: coincidencias[0].id, prospectoId: null } : { clienteId: null, prospectoId: coincidencias[0].id };
        } else if (coincidencias.length === 0) {
          const id = grupo.convs.map((c) => prospectoPorConversacion.get(String(c.id))).find(Boolean);
          if (id) vinculo = { clienteId: null, prospectoId: id };
        }
        const claveEtapa = etapaDe(grupo.convs.flatMap((c) => c.labels || []));
        const etapaId = etapaPorClave.get(claveEtapa) || null;
        const actividad = new Date((principal.last_activity_at || principal.created_at || 0) * 1000);
        const asignado = principal.meta?.assignee?.id ? usuarioPorAgente.get(principal.meta.assignee.id) ?? null : null;
        const atributos = { ...(principal.custom_attributes || {}), origen: "chatwoot", chatwoot_conversation_ids: grupo.convs.map((c) => c.id) };
        const datos = {
          canalId: canal.id,
          contactoWhatsappId: contacto.id,
          nombreContacto: nombre,
          telefono,
          telefonoNormalizado: grupo.clave,
          ...vinculo,
          responsableId: asignado,
          estado: estadoDe(principal.status),
          atributos,
          etapaId,
          etapaDesde: etapaId ? actividad : null,
          creadoEn: new Date((principal.created_at || 0) * 1000),
        };
        try {
          conversacion = await prisma.conversacion.create({ data: { ...datos, numeroCompat: idCompat(principal.id) } });
        } catch (e) {
          if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
          conversacion = await prisma.conversacion.create({ data: datos });
        }
        if (etapaId) {
          await prisma.conversacionEtapaHistorial.create({
            data: { conversacionId: conversacion.id, etapaId, origen: "automatico", detalle: "Importado de Chatwoot", creadoEn: actividad },
          });
        }
        const nombres = [...new Set(grupo.convs.flatMap((c) => c.labels || []))];
        if (nombres.length) {
          const ids = await Promise.all(nombres.map(asegurarEtiqueta));
          await prisma.conversacionEtiqueta.createMany({
            data: ids.map((etiquetaId) => ({ conversacionId: conversacion.id, etiquetaId })),
            skipDuplicates: true,
          });
        }
        r.nuevas++;
      }

      const filas = [...vistos.values()]
        .map(({ m }) => filaMensaje(m, conversacion.id, usuarioPorAgente))
        .filter(Boolean);
      for (let i = 0; i < filas.length; i += 500) {
        const lote = filas.slice(i, i + 500).map(({ id, ...f }) => ({ ...f, numeroCompat: idCompat(id) }));
        const hecho = await prisma.mensaje.createMany({ data: lote, skipDuplicates: true });
        r.mensajes += hecho.count;
      }
      const ultimo = filas.reduce((max, f) => (f.timestamp > max ? f.timestamp : max), new Date(0));
      if (filas.length && ultimo.getTime() > 0) {
        await prisma.conversacion.update({ where: { id: conversacion.id }, data: { ultimoMensajeAt: ultimo } });
      }
    }

    let hechas = 0;
    await pool(grupos, args.concurrencia, async (g) => {
      try {
        await importar(g);
      } catch (e) {
        r.conErrores++;
        console.error(`conversación ${g.convs[0].id}: ${String(e.message).slice(0, 160)}`);
      }
      if (++hechas % 250 === 0) console.log(`… ${hechas}/${grupos.length}`);
    });
    console.log(JSON.stringify({ modo: "escritura", ...r, aImportar: grupos.length }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  });
}
