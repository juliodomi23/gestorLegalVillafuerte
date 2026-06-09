"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import type { Rol } from "@/lib/usuarios";

export function AppShell({
  nombre,
  rol,
  children,
}: {
  nombre: string;
  rol: Rol;
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      {/* Sidebar: fijo en desktop, drawer en móvil */}
      <Sidebar nombre={nombre} rol={rol} drawerOpen={drawer} onClose={() => setDrawer(false)} />

      {/* Overlay del drawer en móvil */}
      {drawer && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setDrawer(false)} />}

      <div className="flex flex-col min-h-screen">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
