export function rutaPublicaSinSesion(pathname: string): boolean {
  return pathname === "/api/meta/webhook";
}

export function autorizarRuta(pathname: string, autenticado: boolean): boolean {
  return rutaPublicaSinSesion(pathname) || autenticado;
}
