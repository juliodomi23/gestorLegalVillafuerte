// Usuarios de la app. POR AHORA viven en código para tener login funcional sin base de datos.
// Cuando conectemos Postgres, esto se reemplaza por una consulta a la tabla `usuarios`
// (con contraseña hasheada). La forma del objeto y los roles se mantienen igual.

export type Rol = "admin" | "abogado" | "asistente";

export type UsuarioApp = {
  id: string;
  nombre: string;       // debe coincidir con el nombre de abogado en los expedientes
  email: string;
  password: string;     // DEMO: en claro. En prod = hash en la BD.
  rol: Rol;
  sucursal: string;
};

export const usuariosApp: UsuarioApp[] = [
  { id: "u1", nombre: "Christian", email: "christian@villafuerte.mx", password: "demo1234", rol: "admin", sucursal: "Tuxtla" },
  { id: "u2", nombre: "Ana", email: "ana@villafuerte.mx", password: "demo1234", rol: "abogado", sucursal: "Tuxtla" },
  { id: "u3", nombre: "Sofía", email: "sofia@villafuerte.mx", password: "demo1234", rol: "asistente", sucursal: "Tapachula" },
];

export function validarCredenciales(email: string, password: string): UsuarioApp | null {
  const u = usuariosApp.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (u && u.password === password) return u;
  return null;
}
