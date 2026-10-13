// Requiere next build y prisma db push sobre la base demo indicada abajo.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const { chromium } = createRequire(import.meta.url)("playwright");
const databaseUrl = "postgresql://gestorlegal_demo:demo_local_no_real@127.0.0.1:55439/gestorlegal_reportes_permiso_test";
const baseUrl = "http://127.0.0.1:3313";
const password = "DemoReportes123!";
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const entorno = {
  ...process.env, DATABASE_URL: databaseUrl, NEXTAUTH_URL: baseUrl,
  NEXTAUTH_SECRET: "demo-reportes-secret-no-real", CHAT_WHATSAPP_ACTIVO: "false",
  WHATSAPP_CLOUD_API_MOCK: "true", WHATSAPP_BLOQUEAR_RED_META: "true",
};
let servidor;
let navegador;
let salidaServidor = "";

async function esperar(condicion, descripcion) {
  for (let intento = 0; intento < 100; intento++) {
    if (await condicion()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Tiempo agotado: ${descripcion}`);
}

async function sesion(email) {
  const contexto = await navegador.newContext({ viewport: { width: 1536, height: 864 } });
  const csrf = await (await contexto.request.get(`${baseUrl}/api/auth/csrf`)).json();
  await contexto.request.post(`${baseUrl}/api/auth/callback/credentials`, {
    form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: `${baseUrl}/inicio`, json: "true" },
  });
  assert.ok((await contexto.cookies()).some((cookie) => cookie.name === "next-auth.session-token"), email);
  await contexto.addInitScript(() => { localStorage.setItem("gl-tour-v1", "1"); localStorage.setItem("gl-novedades-v1", "1"); });
  return contexto;
}

try {
  const hash = await bcrypt.hash(password, 10);
  async function usuario(email, nombre, rol) {
    const datos = { nombre, rol, passwordHash: hash, activo: true, debeCambiarPassword: false, verReportes: false };
    return prisma.usuario.upsert({ where: { email }, create: { email, ...datos }, update: datos });
  }
  await usuario("admin@reportes-demo.test", "Admin Reportes Demo", "admin");
  const asistente = await usuario("asistente@reportes-demo.test", "Asistente Reportes Demo", "asistente");
  const nuevoEmail = `nuevo-${Date.now()}@reportes-demo.test`;
  const nuevo = await prisma.usuario.create({ data: { nombre: "Default Reportes Demo", email: nuevoEmail, rol: "asistente" } });
  assert.equal(nuevo.verReportes, false, "el default no concede permisos");

  const sql = await readFile(new URL("../prisma/migrations/add_reportes_permiso.sql", import.meta.url), "utf8");
  assert.match(sql, /^BEGIN;/);
  assert.match(sql, /COMMIT;\s*$/);
  const alter = sql.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, "").trim();
  for (let intento = 0; intento < 2; intento++) await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe(alter); });
  assert.equal((await prisma.usuario.findUnique({ where: { id: asistente.id } })).verReportes, false, "la migración posterior a db push no habilita permisos");
  console.log("ok: default false, migración después de db push e idempotencia");

  servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3313"], { env: entorno, stdio: ["ignore", "pipe", "pipe"] });
  servidor.stdout.on("data", (dato) => { salidaServidor += dato; });
  servidor.stderr.on("data", (dato) => { salidaServidor += dato; });
  await esperar(async () => { try { return (await fetch(`${baseUrl}/api/auth/csrf`)).ok; } catch { return false; } }, "next start");
  navegador = await chromium.launch({ channel: process.env.CHAT_BROWSER_CHANNEL || "chromium", headless: true });
  const admin = await sesion("admin@reportes-demo.test");
  const persona = await sesion(asistente.email);
  const pagina = await persona.newPage();
  const errores = [];
  pagina.on("pageerror", (error) => errores.push(error.message));
  await pagina.goto(`${baseUrl}/reportes`);
  assert.equal(new URL(pagina.url()).pathname, "/inicio");
  assert.equal(await pagina.locator('nav a[href="/reportes"]').count(), 0);
  console.log("ok: asistente sin permiso redirige a /inicio y no ve el menú");

  const paginaAdmin = await admin.newPage();
  await paginaAdmin.goto(`${baseUrl}/reportes`);
  await paginaAdmin.getByRole("heading", { name: "Reportes", exact: true }).waitFor();
  assert.equal(await paginaAdmin.locator('nav a[href="/reportes"]').count(), 1, "admin no necesita verReportes");
  await paginaAdmin.goto(`${baseUrl}/configuracion`);
  async function editarPermiso(valor) {
    await paginaAdmin.getByRole("row").filter({ hasText: asistente.email }).getByRole("button").first().click();
    const casilla = paginaAdmin.getByRole("checkbox", { name: /^Reportes de llamadas/ });
    await casilla.setChecked(valor);
    const capturaPeticion = paginaAdmin.waitForRequest((peticion) => peticion.method() === "POST" && new URL(peticion.url()).pathname === "/configuracion");
    await paginaAdmin.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    const peticion = await capturaPeticion;
    await esperar(async () => (await prisma.usuario.findUnique({ where: { id: asistente.id } })).verReportes === valor, "guardar casilla de Reportes");
    await paginaAdmin.getByRole("heading", { name: "Editar usuario", exact: true }).waitFor({ state: "hidden" });
    return peticion;
  }
  const peticionAdmin = await editarPermiso(true);
  await pagina.goto(`${baseUrl}/reportes`);
  await pagina.getByRole("heading", { name: "Reportes", exact: true }).waitFor();
  assert.equal(await pagina.locator('nav a[href="/reportes"]').count(), 1);
  await pagina.getByRole("button", { name: "Septiembre", exact: true }).click();
  await esperar(() => new URL(pagina.url()).searchParams.get("mes") === "9", "filtro de mes");
  console.log("ok: admin activa la casilla; asistente ve reporte y menú con su misma sesión");

  await pagina.goto(`${baseUrl}/configuracion`);
  assert.equal(new URL(pagina.url()).pathname, "/inicio", "el permiso no abre Configuración");
  await pagina.goto(`${baseUrl}/caja`);
  assert.equal(new URL(pagina.url()).pathname, "/inicio", "el permiso no abre Caja");
  await editarPermiso(false);

  // Reenvía la escritura real del admin con la cookie de la asistente: la action debe rechazarla.
  const cabeceras = await peticionAdmin.allHeaders();
  delete cabeceras.cookie;
  delete cabeceras["content-length"];
  delete cabeceras.host;
  const rechazo = await persona.request.post(`${baseUrl}/configuracion`, { headers: cabeceras, data: peticionAdmin.postDataBuffer(), maxRedirects: 0 });
  assert.equal(rechazo.status(), 500, "la action rechaza la escritura sin rol admin");
  assert.match(await rechazo.text(), /:E\{"digest":/, "Next oculta el detalle del error de la action en producción");
  await esperar(() => salidaServidor.includes("Error: Requiere rol de administrador"), "rechazo por requireAdmin");
  assert.equal((await prisma.usuario.findUnique({ where: { id: asistente.id } })).verReportes, false);
  await pagina.goto(`${baseUrl}/reportes`);
  assert.equal(new URL(pagina.url()).pathname, "/inicio", "revocación con la sesión anterior");
  assert.equal(await pagina.locator('nav a[href="/reportes"]').count(), 0);
  console.log("ok: revocación inmediata, escritura solo admin, Caja y Configuración cerradas");

  await prisma.usuario.update({ where: { id: asistente.id }, data: { verReportes: true, activo: false } });
  await pagina.goto(`${baseUrl}/reportes`);
  assert.equal(new URL(pagina.url()).pathname, "/inicio", "usuario inactivo con JWT anterior");
  assert.equal(await pagina.locator('nav a[href="/reportes"]').count(), 0);
  assert.deepEqual(errores, []);
  console.log("ok: usuario inactivo no accede aunque conserve sesión y permiso");
  console.log("APIs del reporte: ninguna; los datos llegan por render del servidor. No se abrieron rutas API.");
} catch (error) {
  console.error(error);
  console.error(salidaServidor.slice(-2000));
  process.exitCode = 1;
} finally {
  await navegador?.close();
  servidor?.kill();
  await prisma.$disconnect();
}
