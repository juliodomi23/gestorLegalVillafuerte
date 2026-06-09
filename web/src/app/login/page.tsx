"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Scale, Loader } from "lucide-react";

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
          <div className="w-10 h-10 rounded-md bg-amber/90 flex items-center justify-center">
            <span className="font-serif text-xl font-bold text-navy-deep leading-none">V</span>
          </div>
          <div>
            <div className="font-serif text-[19px] leading-tight">Villafuerte y Asociados</div>
            <div className="text-[12px] text-white/45">Gestor de expedientes</div>
          </div>
        </div>
        <div>
          <Scale size={40} className="text-amber/80 mb-5" strokeWidth={1.5} />
          <h1 className="font-serif text-[34px] leading-tight">Todo el despacho,<br />en un solo lugar.</h1>
          <p className="text-white/55 mt-3 max-w-sm text-[15px]">
            Expedientes, términos, audiencias y clientes — alimentados por WhatsApp, ordenados como un buen expediente.
          </p>
        </div>
        <p className="text-white/30 text-[12px]">Ámbar Rojo Studios</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
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

          <div className="mt-6 rounded-lg border border-line bg-paper/60 px-4 py-3 text-[12.5px] text-muted">
            <p className="font-bold text-ink mb-1">Cuentas de prueba</p>
            <p>Admin: christian@villafuerte.mx</p>
            <p>Abogado: ana@villafuerte.mx</p>
            <p>Contraseña: demo1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
