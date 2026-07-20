"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Loader, ShieldCheck } from "lucide-react";
import { cambiarPasswordAction } from "./actions";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const { update } = useSession();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      await cambiarPasswordAction(password);
      await update({ debeCambiarPassword: false });
      router.push("/inicio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <ShieldCheck size={32} className="text-amber mb-3" strokeWidth={1.5} />
        <p className="eyebrow text-amber">Primer acceso</p>
        <h2 className="font-serif text-[28px] text-ink leading-tight mt-1 mb-1">Cambia tu contraseña</h2>
        <p className="text-muted text-[14px] mb-6">
          Por seguridad, define una contraseña propia antes de continuar.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="eyebrow text-muted block mb-1.5">Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              className="w-full px-3 py-2.5 rounded-lg bg-surface border border-line text-[14px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
            />
          </label>
          <label className="block">
            <span className="eyebrow text-muted block mb-1.5">Confirmar contraseña</span>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              minLength={8}
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
            {cargando ? "Guardando…" : "Guardar y continuar"}
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-center text-[13px] text-muted hover:text-ink transition"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
