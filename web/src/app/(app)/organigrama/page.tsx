import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarOrganigramas } from "@/lib/organigrama";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrganigramaPage() {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";
  const organigramas = await listarOrganigramas();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Organigrama de la empresa</h1>
        <p className="text-sm text-muted-foreground">Manual y organigramas de procesos del despacho.</p>
      </div>

      {organigramas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay documentos.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {organigramas.map((o) => (
            <li key={o.archivo}>
              <a
                href={`/api/organigrama?archivo=${encodeURIComponent(o.archivo)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
              >
                <FileText className="h-5 w-5 shrink-0" />
                <span>{o.titulo}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {esAdmin && (
        <form action="/api/organigrama" method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
          <label className="text-sm font-medium" htmlFor="file">Subir PDF (si el nombre ya existe, lo reemplaza)</label>
          <input id="file" name="file" type="file" accept="application/pdf" required className="text-sm" />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Subir</button>
        </form>
      )}
    </div>
  );
}
