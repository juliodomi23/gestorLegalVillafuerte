import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { ChatCliente } from "@/components/chat/ChatCliente";
import { resolverAcceso } from "@/lib/chat/acceso";
import { chatWhatsappActivo } from "@/lib/chat/modulo";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: { c?: string } }) {
  if (!chatWhatsappActivo()) notFound();
  let acceso;
  try {
    acceso = await resolverAcceso(await requireSession());
  } catch {
    redirect("/login");
  }
  const subtitulo =
    acceso.alcance === "propias"
      ? "Tus conversaciones asignadas"
      : "Conversaciones de los números del despacho";
  return (
    <>
      <div className="hidden lg:block corta:hidden">
        <PageTitle eyebrow="WhatsApp" title="Chat" subtitle={subtitulo} />
      </div>
      <ChatCliente usuarioId={acceso.usuarioId} alcance={acceso.alcance} conversacionInicial={Number(searchParams.c) || undefined} />
    </>
  );
}
