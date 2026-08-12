// Regla pura de visibilidad, sin dependencias: a quién ve un usuario.
// Vive aparte de alcance.ts (que importa Prisma) para poder testearla con
// `node --experimental-strip-types src/lib/alcance.test.ts`.

export function combinar(
  userId: string,
  u: {
    sucursalId: string | null;
    personasACargo: { id: string }[];
    sucursalesACargo: { id: string; usuarios: { id: string }[] }[];
  }
) {
  // Se ve a sí mismo, a las personas que tiene asignadas y a todo el que
  // trabaja en las sucursales que lleva.
  const abogadoIds = new Set<string>([userId]);
  for (const p of u.personasACargo) abogadoIds.add(p.id);
  for (const s of u.sucursalesACargo) {
    for (const p of s.usuarios) abogadoIds.add(p.id);
  }

  // La agenda se comparte por sucursal: la suya más las que lleva.
  const sucursalIdsAgenda = u.sucursalesACargo.map((s) => s.id);
  if (u.sucursalId) sucursalIdsAgenda.push(u.sucursalId);

  return {
    abogadoIds: [...abogadoIds],   // asesorías, seguimientos, expedientes, clientes
    sucursalIdsAgenda,             // citas
  };
}
