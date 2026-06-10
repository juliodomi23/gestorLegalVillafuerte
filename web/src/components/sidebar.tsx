"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  Users,
  ClipboardList,
  PhoneCall,
  UserSearch,
  Wallet,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { Rol } from "@/lib/usuarios";

type Item = { href: string; label: string; icon: LucideIcon; soloAdmin?: boolean };

const grupos: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Despacho",
    items: [
      { href: "/inicio", label: "Inicio", icon: LayoutDashboard },
      { href: "/expedientes", label: "Expedientes", icon: FolderOpen },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    titulo: "Clientes",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/prospectos", label: "Prospectos", icon: UserSearch },
      { href: "/asesorias", label: "Asesorías", icon: ClipboardList },
      { href: "/seguimientos", label: "Seguimientos", icon: PhoneCall },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/caja", label: "Caja", icon: Wallet, soloAdmin: true },
      { href: "/configuracion", label: "Configuración", icon: Settings, soloAdmin: true },
    ],
  },
];

const rolLabel: Record<Rol, string> = { admin: "Administrador", abogado: "Abogado", asistente: "Asistente" };

export function Sidebar({
  nombre,
  rol,
  drawerOpen = false,
  onClose,
}: {
  nombre: string;
  rol: Rol;
  drawerOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const iniciales = nombre.slice(0, 2).toUpperCase();
  const [logoError, setLogoError] = useState(false);

  return (
    <aside
      className={`bg-navy-deep text-white/85 flex flex-col w-[244px] z-40
        fixed inset-y-0 left-0 transition-transform lg:static lg:translate-x-0
        ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/10">
            {!logoError ? (
              <img
                src="/Logo.jpg"
                alt="Logo"
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="font-serif text-lg font-bold text-white leading-none flex items-center justify-center w-full h-full">V</span>
            )}
          </div>
          <div>
            <div className="font-serif text-[17px] leading-tight text-white">Villafuerte</div>
            <div className="text-[11px] text-white/45 tracking-wide">y Asociados</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 text-[14px]">
        {grupos.map((g) => {
          const items = g.items.filter((it) => !it.soloAdmin || rol === "admin");
          if (items.length === 0) return null;
          return (
            <div key={g.titulo} className="mb-2">
              <p className="eyebrow text-white/30 px-5 mb-2 mt-3">{g.titulo}</p>
              {items.map(({ href, label, icon: Icon }) => {
                const activo = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-5 py-2.5 border-l-[3px] transition-colors ${
                      activo ? "text-white bg-white/[.06] border-amber" : "border-transparent hover:bg-white/[.04]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    {label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[12px] font-bold">{iniciales}</div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-[13px] text-white truncate">{nombre}</div>
          <div className="text-[11px] text-white/45">{rolLabel[rol]}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Cerrar sesión"
          className="text-white/45 hover:text-white transition-colors"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  );
}
