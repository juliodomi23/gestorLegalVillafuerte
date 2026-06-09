"use client";

import Link from "next/link";
import { Search, Bell, Plus, Menu } from "lucide-react";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="bg-paper/80 backdrop-blur border-b border-line sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden p-2 -ml-2 rounded-lg text-ink hover:bg-line/50 transition-colors" title="Menú">
          <Menu size={20} />
        </button>

        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            placeholder="Buscar expediente, cliente o número de juicio…"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface border border-line text-[13.5px] placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
          />
        </div>

        <span className="flex-1 sm:hidden" />

        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors">
          <Bell size={18} strokeWidth={1.75} />
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
        </button>
        <Link href="/expedientes" className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors shadow-sm">
          <Plus size={18} strokeWidth={1.75} /> <span className="hidden sm:inline">Nuevo expediente</span>
        </Link>
      </div>
      <div className="h-px bg-gradient-to-r from-amber/60 via-amber/20 to-transparent" />
    </header>
  );
}
