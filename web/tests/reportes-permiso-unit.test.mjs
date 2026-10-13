import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { estado } from "./reportes-guard-mocks.mjs";
import { autorizarRuta } from "../src/lib/autorizacion-middleware.ts";
import { usuarioSchema } from "../src/lib/validaciones.ts";

register("./reportes-guard-loader.mjs", import.meta.url);
const { requireReportes, puedeVerReportes, requireAdmin } = await import("../src/lib/guard.ts");

function preparar(rol = "asistente", permiso = false, activo = true) {
  estado.sesion = { user: { id: "usuario-prueba", name: "Usuario", email: "usuario@example.test", rol, sucursal: "Tuxtla" } };
  estado.usuario = { activo, verReportes: permiso };
  estado.consultas = [];
}

test("admin accede sin necesitar el permiso", async () => {
  preparar("admin");
  assert.equal((await requireReportes()).rol, "admin");
  assert.equal(await puedeVerReportes(), true);
  assert.equal(estado.consultas.length, 0);
});

test("asistente activo con permiso puede ver reportes pero no obtiene acceso admin", async () => {
  preparar("asistente", true);
  assert.equal((await requireReportes()).id, "usuario-prueba");
  assert.equal(await puedeVerReportes(), true);
  assert.deepEqual(estado.consultas[0], { where: { id: "usuario-prueba" }, select: { activo: true, verReportes: true } });
  await assert.rejects(requireAdmin(), /administrador/);
});

test("usuario sin permiso, inactivo o eliminado no accede", async () => {
  for (const [permiso, activo] of [[false, true], [true, false], [false, false]]) {
    preparar("asistente", permiso, activo);
    await assert.rejects(requireReportes(), /No tienes acceso/);
    assert.equal(await puedeVerReportes(), false);
  }
  preparar();
  estado.usuario = null;
  await assert.rejects(requireReportes(), /No tienes acceso/);
});

test("el permiso y la actividad se consultan en cada petición, con la misma sesión", async () => {
  preparar("asistente", true);
  await requireReportes();
  estado.usuario.verReportes = false;
  await assert.rejects(requireReportes(), /No tienes acceso/);
  estado.usuario.verReportes = true;
  estado.usuario.activo = false;
  await assert.rejects(requireReportes(), /No tienes acceso/);
  assert.equal(estado.consultas.length, 3);
});

test("sin sesión no accede y no consulta usuarios", async () => {
  preparar();
  estado.sesion = null;
  await assert.rejects(requireReportes(), /No autenticado/);
  assert.equal(await puedeVerReportes(), false);
  assert.equal(estado.consultas.length, 0);
});

test("autorizarRuta conserva la barrera de sesión; rol, permiso y actividad se verifican en el guard", () => {
  for (const caso of ["admin", "con permiso", "sin permiso", "inactivo con sesión previa"]) {
    assert.equal(autorizarRuta("/reportes", true), true, caso);
    assert.equal(autorizarRuta("/reportes?mes=10", true), true, caso);
  }
  for (const ruta of ["/reportes", "/configuracion", "/caja", "/api/chat/usuarios", "/api/meta/webhook/extra"]) {
    assert.equal(autorizarRuta(ruta, false), false, ruta);
  }
  assert.equal(autorizarRuta("/api/meta/webhook", false), true);
  assert.equal(autorizarRuta("/api/v1/accounts/1/conversations", false), true);
});

test("el formulario acepta el permiso booleano y lo deja en false si se omite", () => {
  const base = { nombre: "Usuario", rol: "asistente" };
  assert.equal(usuarioSchema.parse(base).verReportes, false);
  assert.equal(usuarioSchema.parse({ ...base, verReportes: true }).verReportes, true);
  assert.equal(usuarioSchema.safeParse({ ...base, verReportes: "true" }).success, false);
});
