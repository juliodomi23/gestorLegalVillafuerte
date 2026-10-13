const mock = new URL("./reportes-guard-mocks.mjs", import.meta.url).href;

export function resolve(specifier, contexto, siguiente) {
  if (["next-auth", "@/lib/auth", "@/lib/prisma"].includes(specifier)) return { url: mock, shortCircuit: true };
  return siguiente(specifier, contexto);
}
