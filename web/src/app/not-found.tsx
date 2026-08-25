import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm text-center">
        <img src="/Logo.jpg" alt="" className="w-14 h-14 object-contain rounded-lg mx-auto mb-5" />
        <p className="eyebrow text-amber">Error 404</p>
        <h1 className="font-serif text-[32px] text-ink leading-tight mt-1 mb-2">Esta página no existe</h1>
        <p className="text-muted text-[14px] mb-6">
          Revisa el enlace o vuelve al inicio.
        </p>
        <Link
          href="/inicio"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-navy text-white text-[14px] font-bold hover:bg-navy-deep transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
