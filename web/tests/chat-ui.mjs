// Ejecutar después de next build. Playwright debe estar instalado o disponible por NODE_PATH.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AHORA, crearEscenario, crearMensaje, IMAGEN, audioDemo } from "./chat-ui-fixtures.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const puerto = "3312";
const baseUrl = `http://127.0.0.1:${puerto}`;
const salida = path.resolve(process.env.CHAT_CAPTURAS_DIR || "tests/artifacts/chat");
const omitirCapturas = new Set((process.env.CHAT_CAPTURAS_OMITIR || "").split(",").filter(Boolean));
const entorno = {
  ...process.env, DATABASE_URL: "postgresql://gestorlegal_demo:demo_local_no_real@127.0.0.1:55439/gestorlegal_chat_demo",
  NEXTAUTH_SECRET: "demo-nextauth-secret-not-real", NEXTAUTH_URL: baseUrl, CHAT_WHATSAPP_ACTIVO: "true",
  WHATSAPP_CLOUD_API_MOCK: "true", WHATSAPP_BLOQUEAR_RED_META: "true",
};
const servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", puerto], { env: entorno, stdio: ["ignore", "pipe", "pipe"] });
let logServidor = "";
servidor.stdout.on("data", (dato) => { logServidor += dato; });
servidor.stderr.on("data", (dato) => { logServidor += dato; });
const resultados = [];
let navegador;

async function esperar(condicion, descripcion, limite = 12000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limite) {
    if (await condicion()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Tiempo agotado: ${descripcion}`);
}

async function iniciarSesion(contexto) {
  const csrf = await (await contexto.request.get(`${baseUrl}/api/auth/csrf`)).json();
  await contexto.request.post(`${baseUrl}/api/auth/callback/credentials`, {
    form: { csrfToken: csrf.csrfToken, email: "admin@chat-demo.test", password: "DemoChat123!", callbackUrl: `${baseUrl}/chat`, json: "true" },
  });
  assert.ok((await contexto.cookies()).some((cookie) => cookie.name === "next-auth.session-token"), "sesión local demo");
}

async function preparar(viewport) {
  const contexto = await navegador.newContext({ viewport, timezoneId: "America/Mexico_City", locale: "es-MX", colorScheme: "light" });
  await iniciarSesion(contexto);
  await contexto.addInitScript(() => { localStorage.setItem("gl-tour-v1", "1"); localStorage.setItem("gl-novedades-v1", "1"); });
  const pagina = await contexto.newPage();
  await pagina.clock.setFixedTime(AHORA);
  const escenario = crearEscenario();
  const controles = { retrasoHistorial: {}, retrasoMedia: 1200, envios: [], consultas: [], errorLista: false, errorMensajes: false };
  const errores = [];
  pagina.on("pageerror", (error) => errores.push(error.message));
  await pagina.route("**/*", async (ruta) => {
    const peticion = ruta.request();
    const url = new URL(peticion.url());
    if (url.origin !== baseUrl) return ruta.abort();
    if (!url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/auth/")) return ruta.continue();
    const json = (datos, status = 200) => ruta.fulfill({ status, json: datos });
    if (url.pathname === "/api/conversaciones") {
      controles.consultas.push(url.searchParams.get("q"));
      if (controles.errorLista) return json({ error: "Fallo de prueba" }, 503);
      const conversaciones = escenario.conversaciones.map((item) => {
        const ultimo = escenario.historiales[item.id].at(-1);
        return { ...item, ultimoMensajeAt: ultimo?.timestamp || null, preview: ultimo?.contenido || "" };
      }).filter((item) => !url.searchParams.get("q") || item.contacto.nombre.toLowerCase().includes(url.searchParams.get("q").toLowerCase()));
      return json({ conversaciones, total: 13000 });
    }
    const historial = url.pathname.match(/^\/api\/conversaciones\/([^/]+)\/mensajes$/);
    if (historial) {
      const datos = structuredClone(escenario.historiales[historial[1]] || []);
      if (controles.retrasoHistorial[historial[1]]) await new Promise((resolve) => setTimeout(resolve, controles.retrasoHistorial[historial[1]]));
      return controles.errorMensajes ? json({ error: "Fallo de prueba" }, 503) : json({ mensajes: datos });
    }
    const detalle = url.pathname.match(/^\/api\/conversaciones\/([^/]+)$/);
    if (detalle) {
      const item = escenario.conversaciones.find((c) => c.id === detalle[1]);
      return json({ conversacion: { ...item, nombreContacto: item.contacto.nombre, telefono: item.contacto.telefono, atributos: {}, canal: { nombre: item.canalNombre, telefono: null, activo: true }, cliente: null, prospecto: null, citas: [], asesorias: [] } });
    }
    if (url.pathname.endsWith("/media")) {
      await new Promise((resolve) => setTimeout(resolve, controles.retrasoMedia));
      return ruta.fulfill({ contentType: url.pathname.includes("imagen") ? "image/svg+xml" : "audio/wav", body: url.pathname.includes("imagen") ? IMAGEN : audioDemo() });
    }
    if (url.pathname === "/api/mensajes/enviar") {
      const datos = peticion.postDataJSON();
      controles.envios.push(datos);
      escenario.historiales[datos.conversacionId].push(crearMensaje(`enviado-${controles.envios.length}`, datos.texto || datos.plantilla?.vistaPrevia, AHORA, "saliente", { privado: !!datos.privado }));
      return json({ ok: true });
    }
    if (url.pathname === "/api/meta/templates") return json({ plantillas: [{ name: "seguimiento_demo", language: "es_MX", status: "APPROVED", components: [{ type: "BODY", text: "Hola {{1}}, podemos retomar su consulta." }] }] });
    if (url.pathname === "/api/embudo/etapas") return json({ etapas: [{ id: "cita", nombre: "Cita agendada" }] });
    if (url.pathname === "/api/chat/usuarios") return json({ usuarios: [{ id: "asesora", nombre: "Lic. Elena Ruiz" }] });
    if (url.pathname === "/api/chat/etiquetas") return json({ etiquetas: [] });
    return json({});
  });
  return { contexto, pagina, escenario, controles, errores };
}

const zona = (pagina) => pagina.getByLabel("Mensajes de la conversación", { exact: true });
const distancia = (pagina) => zona(pagina).evaluate((elemento) => elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight);

async function capturar(pagina, nombre) {
  if (!omitirCapturas.has(nombre)) await pagina.screenshot({ path: path.join(salida, nombre) });
}

async function abrir(pagina, numero) {
  await pagina.goto(`${baseUrl}/chat${numero ? `?c=${numero}` : ""}`);
  const aviso = pagina.getByRole("button", { name: "Cerrar aviso", exact: true });
  if (await aviso.count()) await aviso.click();
  await pagina.locator('[data-mensaje-id="reciente-8"], [data-mensaje-id="adjunto-respuesta"], [data-mensaje-id="cerrada-1"]').first().waitFor({ state: "attached" });
}

async function comprobarMedidas(pagina, nombre) {
  const medidas = await pagina.evaluate(() => {
    const raiz = document.querySelector(".chat-cliente");
    const zona = document.querySelector('[aria-label="Mensajes de la conversación"]');
    const relleno = parseFloat(getComputedStyle(raiz.closest("main")).paddingBottom);
    return { paginaAlto: document.documentElement.scrollHeight, ventanaAlto: innerHeight, paginaAncho: document.documentElement.scrollWidth, ventanaAncho: innerWidth, chatFinal: raiz.getBoundingClientRect().bottom, finalDisponible: innerHeight - relleno, scrollAncho: zona.scrollWidth, zonaAncho: zona.clientWidth };
  });
  assert.ok(medidas.paginaAlto <= medidas.ventanaAlto + 1, `${nombre}: scroll vertical de página ${JSON.stringify(medidas)}`);
  assert.ok(Math.abs(medidas.chatFinal - medidas.finalDisponible) <= 2, `${nombre}: no aprovecha el alto disponible ${JSON.stringify(medidas)}`);
  assert.ok(medidas.paginaAncho <= medidas.ventanaAncho, `${nombre}: overflow horizontal de página`);
  assert.ok(medidas.scrollAncho <= medidas.zonaAncho + 1, `${nombre}: overflow horizontal en mensajes`);
  resultados.push({ prueba: nombre, medidas });
}

try {
  await mkdir(salida, { recursive: true });
  await esperar(async () => { try { return (await fetch(`${baseUrl}/api/auth/csrf`)).ok; } catch { return false; } }, "servidor local");
  navegador = await chromium.launch({ channel: process.env.CHAT_BROWSER_CHANNEL || "chromium", headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1180, height: 760 }, { width: 1536, height: 864 }]) {
    const nombre = `${viewport.width}x${viewport.height}`;
    const { contexto, pagina, errores } = await preparar(viewport);
    await abrir(pagina, 9101);
    await esperar(async () => await distancia(pagina) < 2, `${nombre}: apertura al final`);
    await comprobarMedidas(pagina, nombre);
    await capturar(pagina, `${nombre}-conversacion.png`);
    await zona(pagina).evaluate((elemento) => { elemento.scrollTop = elemento.scrollHeight * .5; });
    await capturar(pagina, `${nombre}-historial.png`);
    await abrir(pagina, 9102);
    await pagina.waitForFunction(() => [...document.querySelectorAll('[aria-label="Mensajes de la conversación"] img')].every((imagen) => imagen.complete && imagen.naturalWidth > 0));
    await esperar(async () => await distancia(pagina) < 2, `${nombre}: final después de cargar imagen/audio`);
    await comprobarMedidas(pagina, `${nombre}-adjuntos`);
    await capturar(pagina, `${nombre}-adjuntos.png`);
    assert.deepEqual(errores, [], `${nombre}: errores de navegador`);
    console.log(`ok: ${nombre}, apertura al final, historial, imagen/audio y medidas`);
    await contexto.close();
  }

  const { contexto, pagina, escenario, controles, errores } = await preparar({ width: 390, height: 844 });
  await abrir(pagina);
  await pagina.getByRole("button").filter({ hasText: "Mariana López Demo" }).click();
  await esperar(async () => await distancia(pagina) < 2, "chat móvil oculto y luego visible");
  await pagina.getByRole("button", { name: "Volver a la lista" }).click();
  await capturar(pagina, "390x844-lista.png");
  await pagina.getByRole("button").filter({ hasText: "Mariana López Demo" }).click();
  escenario.historiales.largo.push(crearMensaje("poll-abajo", "Nuevo mensaje mientras lees abajo", AHORA));
  await pagina.locator('[data-mensaje-id="poll-abajo"]').waitFor();
  assert.ok(await distancia(pagina) < 2, "polling mantiene el final");
  await zona(pagina).evaluate((elemento) => { elemento.scrollTop -= 110; });
  escenario.historiales.largo.push(crearMensaje("poll-cerca", "Nuevo dentro del umbral de 120 px", AHORA));
  await pagina.locator('[data-mensaje-id="poll-cerca"]').waitFor();
  assert.ok(await distancia(pagina) < 2, "polling respeta el umbral");
  await zona(pagina).evaluate((elemento) => { elemento.scrollTop = 600; });
  const posicion = await zona(pagina).evaluate((elemento) => elemento.scrollTop);
  escenario.historiales.largo.push(crearMensaje("poll-arriba-1", "Nuevo con el historial abierto", AHORA), crearMensaje("poll-arriba-2", "Segundo mensaje nuevo", AHORA));
  await pagina.getByRole("button", { name: "2 nuevos" }).waitFor();
  assert.equal(await zona(pagina).evaluate((elemento) => elemento.scrollTop), posicion, "polling no mueve el historial");
  escenario.historiales.largo.at(-1).status = "leido";
  await pagina.waitForTimeout(3300);
  assert.equal(await pagina.getByRole("button", { name: "2 nuevos" }).count(), 1, "no cuenta dos veces ni cuenta cambios de estado");
  await capturar(pagina, "390x844-mensajes-nuevos.png");
  await pagina.getByRole("button", { name: "2 nuevos" }).click();
  assert.ok(await distancia(pagina) < 2, "botón baja al final");
  const campo = pagina.getByRole("textbox", { name: "Escribe un mensaje", exact: true });
  assert.equal(await pagina.getByRole("button", { name: "Enviar", exact: true }).isDisabled(), true);
  await campo.fill("Primera línea");
  await campo.press("Shift+Enter");
  await campo.press("a");
  assert.match(await campo.inputValue(), /\n/);
  assert.equal(controles.envios.length, 0, "Shift+Enter no envía");
  await campo.fill(Array(10).fill("Texto con varias líneas").join("\n"));
  assert.ok(await campo.evaluate((elemento) => elemento.offsetHeight) <= 138, "compositor máximo cinco líneas");
  await comprobarMedidas(pagina, "compositor-móvil");
  await campo.fill("Enviado con Enter");
  await campo.press("Enter");
  await esperar(() => controles.envios.length === 1, "Enter envía una vez");
  assert.equal(controles.envios[0].texto, "Enviado con Enter");
  await esperar(async () => await campo.inputValue() === "", "limpia compositor después de enviar");
  await pagina.getByRole("button", { name: "Volver a la lista" }).click();
  await esperar(async () => (await pagina.getByRole("button").filter({ hasText: "Mariana López Demo" }).innerText()).includes("Tú:"), "prefijo saliente conocido");
  await pagina.getByRole("textbox", { name: "Buscar conversación" }).fill("Daniela");
  await esperar(() => controles.consultas.includes("Daniela"), "búsqueda del servidor ?q=");
  await pagina.getByRole("textbox", { name: "Buscar conversación" }).fill("");
  await esperar(async () => await pagina.getByRole("button").filter({ hasText: "Óscar Robles Demo" }).count() === 1, "restaura lista");
  await pagina.getByRole("button").filter({ hasText: "Óscar Robles Demo" }).click();
  await pagina.getByRole("button", { name: "Usar plantilla" }).waitFor();
  assert.equal(await campo.isDisabled(), true, "ventana cerrada deshabilita texto");
  await capturar(pagina, "390x844-ventana-cerrada.png");
  await pagina.getByRole("button", { name: "Usar plantilla" }).click();
  await pagina.getByRole("combobox", { name: "Plantilla aprobada" }).selectOption("seguimiento_demo:es_MX");
  assert.match(await pagina.getByRole("textbox", { name: "Valor para {{1}}" }).inputValue(), /Óscar/);
  await pagina.getByRole("button", { name: "Cerrar", exact: true }).click();
  await pagina.getByRole("button", { name: "Volver a la lista" }).click();
  await pagina.getByRole("button").filter({ hasText: "Laura Sánchez Demo" }).click();
  await pagina.getByText("Todavía no hay mensajes", { exact: true }).waitFor();
  await capturar(pagina, "390x844-vacio.png");
  await pagina.getByRole("button", { name: "Volver a la lista" }).click();
  controles.retrasoHistorial.largo = 1200;
  await pagina.getByRole("button").filter({ hasText: "Mariana López Demo" }).click();
  await pagina.getByRole("status", { name: "Cargando mensajes" }).waitFor();
  await capturar(pagina, "390x844-cargando.png");
  await pagina.getByRole("button", { name: "Volver a la lista" }).click();
  await pagina.getByRole("button").filter({ hasText: "Daniela Méndez Demo" }).click();
  await pagina.locator('[data-mensaje-id="adjunto-respuesta"]').waitFor();
  await pagina.waitForTimeout(1500);
  assert.equal(await pagina.locator('[data-mensaje-id="reciente-8"]').count(), 0, "respuesta tardía de otro chat se descarta");
  await abrir(pagina, 9102);
  await zona(pagina).evaluate((elemento) => { elemento.scrollTop = 400; });
  const posicionMedia = await zona(pagina).evaluate((elemento) => elemento.scrollTop);
  await pagina.waitForFunction(() => [...document.querySelectorAll('[aria-label="Mensajes de la conversación"] img')].every((imagen) => imagen.complete && imagen.naturalWidth > 0));
  assert.equal(await zona(pagina).evaluate((elemento) => elemento.scrollTop), posicionMedia, "imagen tardía respeta la lectura del historial");
  assert.deepEqual(errores, []);
  resultados.push({ prueba: "móvil: polling, umbral, nuevos, compositor, búsqueda, ventana, vacío, carga y respuestas tardías", ok: true });
  await contexto.close();

  await writeFile(path.join(salida, "verificacion-ui.json"), JSON.stringify(resultados, null, 2));
  console.log("ok: comportamiento del chat y capturas guardadas en", salida);
} catch (error) {
  console.error(error);
  console.error(logServidor.slice(-2500));
  process.exitCode = 1;
} finally {
  await navegador?.close();
  servidor.kill();
}
