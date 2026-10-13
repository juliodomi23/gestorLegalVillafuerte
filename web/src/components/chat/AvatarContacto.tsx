const COLORES = ["bg-navy/10 text-navy", "bg-success-wash text-success", "bg-amber-wash text-amber", "bg-danger-wash text-danger"];

export function AvatarContacto({ nombre, telefono, grande = false }: { nombre: string; telefono: string; grande?: boolean }) {
  const iniciales = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-MX") || "?";
  const color = Array.from(telefono).reduce((valor, letra) => (valor * 31 + letra.charCodeAt(0)) >>> 0, 0) % COLORES.length;
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${grande ? "h-14 w-14 text-lg" : "h-10 w-10 text-[13px]"} ${COLORES[color]}`}>{iniciales}</span>;
}
