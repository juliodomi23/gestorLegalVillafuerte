import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { ChatCliente } from "@/components/chat/ChatCliente";
import { chatWhatsappActivo } from "@/lib/chat/modulo";
import { requireAdmin } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  if (!chatWhatsappActivo()) notFound();
  try {
    await requireAdmin();
  } catch {
    redirect("/inicio");
  }
  return (
    <>
      <PageTitle eyebrow="WhatsApp" title="Chat" subtitle="Conversaciones del número oficial del despacho" />
      <ChatCliente />
    </>
  );
}
