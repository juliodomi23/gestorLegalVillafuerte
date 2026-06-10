"use client";

import { useState } from "react";
import { FileText, ExternalLink } from "lucide-react";

type DocLink = { id: string; nombre: string; linkDrive: string };

export function DocumentosBtn({ documentos }: { documentos: DocLink[] }) {
  const [open, setOpen] = useState(false);

  if (documentos.length === 0) return null;

  if (documentos.length === 1) {
    return (
      <a
        href={documentos[0].linkDrive}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors"
      >
        <FileText size={18} strokeWidth={1.75} /> Ver documento
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors"
      >
        <FileText size={18} strokeWidth={1.75} />
        Documentos
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-navy/[.08] text-navy text-[11px] font-bold leading-none">
          {documentos.length}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 bg-white border border-line rounded-xl shadow-card z-50 min-w-[240px] overflow-hidden">
            {documentos.map((d) => (
              <a
                key={d.id}
                href={d.linkDrive}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-paper transition-colors border-b border-line last:border-0"
                onClick={() => setOpen(false)}
              >
                <ExternalLink size={14} className="text-muted shrink-0" />
                <span className="truncate flex-1">{d.nombre}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
