"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tag, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Etiqueta } from "./CompetenciasPageContent";

export function EtiquetasInline({
  cardId,
  current,
  todas,
  disabled,
}: {
  cardId: string;
  current: { etiqueta: Etiqueta }[];
  todas: Etiqueta[];
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Optimistic local override — null means "use prop"
  const [localIds, setLocalIds] = useState<Set<string> | null>(null);

  const serverIds = new Set(current.map((c) => c.etiqueta.id));
  const currentIds = localIds ?? serverIds;

  async function toggle(id: string) {
    if (disabled) return;
    const next = new Set(currentIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setLocalIds(next); // optimistic
    setSaving(true);
    const res = await fetch(`/api/competencias/${cardId}/etiquetas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etiquetaIds: Array.from(next) }),
    });
    setSaving(false);
    if (!res.ok) {
      setLocalIds(serverIds); // revert
      toast.error("Erro ao salvar etiquetas");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["competencias-page-data"] });
  }

  const exibidas = localIds
    ? todas.filter((t) => localIds.has(t.id))
    : current.map((c) => c.etiqueta);

  return (
    <div className="relative inline-flex items-center gap-1 flex-wrap">
      {exibidas.map((etiqueta) => (
        <span
          key={etiqueta.id}
          className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ backgroundColor: `${etiqueta.cor}20`, color: etiqueta.cor }}
        >
          {etiqueta.nome}
        </span>
      ))}
      {!disabled && (
        <button
          onClick={(ev) => { ev.stopPropagation(); setOpen((v) => !v); }}
          className="inline-flex items-center justify-center h-5 w-5 rounded border border-dashed text-muted-foreground hover:bg-muted"
          title="Editar etiquetas"
        >
          {exibidas.length === 0 ? <Tag className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-50 w-52 rounded-md border shadow-md p-1 max-h-60 overflow-y-auto" style={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)" }}>
            {todas.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma etiqueta cadastrada</p>}
            {todas.map((t) => (
              <label key={t.id} className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer text-sm">
                <input type="checkbox" checked={currentIds.has(t.id)} disabled={saving} onChange={() => toggle(t.id)} />
                <span className="w-2 h-2 rounded-full" style={{ background: t.cor }} />
                {t.nome}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
