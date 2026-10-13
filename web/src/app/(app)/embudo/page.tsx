import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { EmbudoCliente } from "@/components/embudo/EmbudoCliente";
import { resolverAcceso } from "@/lib/chat/acceso";
import { chatWhatsappActivo } from "@/lib/chat/modulo";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function EmbudoPage() {
  if (!chatWhatsappActivo()) notFound();
  let acceso;
  try {
    acceso = await resolverAcceso(await requireSession());
  } catch {
    redirect("/login");
  }
  return (
    <>
      <div className="hidden lg:block corta:hidden">
        <PageTitle
          eyebrow="WhatsApp"
          title="Embudo"
          subtitle={acceso.alcance === "propias" ? "Tus conversaciones por etapa" : "Cada conversación, en la etapa en la que va"}
        />
      </div>
      <EmbudoCliente alcance={acceso.alcance} />
    </>
  );
}
