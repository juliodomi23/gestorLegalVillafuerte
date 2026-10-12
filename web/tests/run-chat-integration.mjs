import { spawn } from "node:child_process";

const puerto = "3310";
const baseUrl = `http://127.0.0.1:${puerto}`;
const entorno = {
  ...process.env,
  DATABASE_URL: "postgresql://gestorlegal_demo:demo_local_no_real@127.0.0.1:55439/gestorlegal_chat_demo",
  NEXTAUTH_SECRET: "demo-nextauth-secret-not-real",
  NEXTAUTH_URL: baseUrl,
  CHAT_WHATSAPP_ACTIVO: "true",
  META_APP_SECRET: "demo-app-secret",
  META_WEBHOOK_VERIFY_TOKEN: "demo-verify-token",
  META_TOKEN_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  WHATSAPP_CLOUD_API_MOCK: "true",
  WHATSAPP_BLOQUEAR_RED_META: "true",
  CHAT_TEST_BASE_URL: baseUrl,
};

function iniciarServidor(env, puertoServidor = puerto) {
  return spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", puertoServidor], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function esperarServidor(url = baseUrl) {
  for (let intento = 0; intento < 40; intento += 1) {
    try {
      const respuesta = await fetch(`${url}/api/auth/csrf`);
      if (respuesta.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("La aplicación de prueba no inició a tiempo");
}

let servidor = iniciarServidor(entorno);
try {
  await esperarServidor();
  const prueba = spawn(process.execPath, ["tests/chat-integration.mjs"], {
    env: entorno,
    stdio: "inherit",
  });
  const codigo = await new Promise((resolve) => prueba.on("exit", resolve));
  if (codigo !== 0) throw new Error(`Falló la integración con código ${codigo}`);

  servidor.kill();
  await new Promise((resolve) => servidor.on("exit", resolve));
  const baseUrlApagado = "http://127.0.0.1:3311";
  const entornoApagado = {
    ...entorno,
    CHAT_WHATSAPP_ACTIVO: "false",
    CHAT_TEST_BASE_URL: baseUrlApagado,
    NEXTAUTH_URL: baseUrlApagado,
  };
  servidor = iniciarServidor(entornoApagado, "3311");
  await esperarServidor(baseUrlApagado);
  const pruebaApagado = spawn(process.execPath, ["tests/chat-disabled.mjs"], {
    env: entornoApagado,
    stdio: "inherit",
  });
  const codigoApagado = await new Promise((resolve) => pruebaApagado.on("exit", resolve));
  if (codigoApagado !== 0) process.exitCode = codigoApagado ?? 1;
} finally {
  servidor.kill();
}
