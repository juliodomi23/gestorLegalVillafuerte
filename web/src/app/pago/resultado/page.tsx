const MENSAJES: Record<string, { titulo: string; texto: string; color: string }> = {
  approved: {
    titulo: "Pago recibido",
    texto: "Tu pago fue aprobado. En breve nuestro equipo continuará con tu atención.",
    color: "text-success",
  },
  pending: {
    titulo: "Pago en revisión",
    texto: "Mercado Pago está procesando la operación. Te avisaremos cuando quede confirmada.",
    color: "text-amber",
  },
  failure: {
    titulo: "El pago no se completó",
    texto: "Puedes volver a abrir el enlace de pago o comunicarte con nuestro equipo para recibir ayuda.",
    color: "text-danger",
  },
};

export default async function ResultadoPago({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "pending" } = await searchParams;
  const mensaje = MENSAJES[estado] ?? MENSAJES.pending;

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-5">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-card p-8 text-center">
        <img src="/Logo.jpg" alt="Villafuerte y Asociados" className="h-20 w-20 rounded-full object-cover mx-auto mb-5" />
        <p className="eyebrow text-muted mb-2">Villafuerte y Asociados</p>
        <h1 className={`font-serif text-3xl ${mensaje.color}`}>{mensaje.titulo}</h1>
        <p className="text-muted mt-4 leading-relaxed">{mensaje.texto}</p>
        <p className="text-[13px] text-muted mt-7">Ya puedes cerrar esta ventana.</p>
      </section>
    </main>
  );
}
