"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setCargando(false);
    if (res?.error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      router.push("/inicio");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="hidden lg:flex flex-col justify-between bg-navy-deep text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/10">
            <img src="/Logo.jpg" alt="Bufete Jurídico Villafuerte & Asociados" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-serif text-[19px] leading-tight">Villafuerte y Asociados</div>
            <div className="text-[12px] text-white/45">Gestor de expedientes</div>
          </div>
        </div>
        <div>
          <img src="/Logo.jpg" alt="" className="w-24 h-24 object-contain rounded-lg mb-5" />
          <h1 className="font-serif text-[34px] leading-tight">Todo el despacho,<br />en un solo lugar.</h1>
          <p className="text-white/55 mt-3 max-w-sm text-[15px]">
            Expedientes, términos, audiencias y clientes — alimentados por WhatsApp, ordenados como un buen expediente.
          </p>
          <p className="text-amber/80 mt-4 text-[13px] italic">"Nada por la fuerza, todo por el derecho y la razón"</p>
        </div>
        <p className="text-white/30 text-[12px]">Ámbar Rojo Studios</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden w-14 h-14 rounded-lg overflow-hidden mb-5 mx-auto">
            <img src="/Logo.jpg" alt="Bufete Jurídico Villafuerte & Asociados" className="w-full h-full object-cover" />
          </div>
          <p className="eyebrow text-amber">Acceso</p>
          <h2 className="font-serif text-[28px] text-ink leading-tight mt-1 mb-1">Iniciar sesión</h2>
          <p className="text-muted text-[14px] mb-6">Entra con tu cuenta del despacho.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="eyebrow text-muted block mb-1.5">Correo</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@villafuerte.mx"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-line text-[14px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
              />
            </label>
            <label className="block">
              <span className="eyebrow text-muted block mb-1.5">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-line text-[14px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
              />
            </label>

            {error && <p className="text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-[14px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
            >
              {cargando && <Loader size={16} className="animate-spin" />}
              {cargando ? "Entrando…" : "Entrar"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
