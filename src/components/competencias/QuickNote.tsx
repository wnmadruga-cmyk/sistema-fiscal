"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function QuickNote({
  cardId,
  count,
  disabled,
}: {
  cardId: string;
  count: number;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [localCount, setLocalCount] = useState(count);

  async function send() {
    if (!texto.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/competencias/${cardId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, inline: true }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao enviar nota");
      return;
    }
    toast.success("Nota adicionada");
    setLocalCount((n) => n + 1); // optimistic badge
    setTexto("");
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["competencias-page-data"] });
  }

  const displayCount = localCount;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen((v) => !v); }}
        disabled={disabled}
        className={`relative inline-flex items-center justify-center h-6 w-6 rounded border ${disabled ? "border-muted text-muted-foreground/40 cursor-not-allowed" : "border-input hover:bg-muted"}`}
        title={disabled ? "Abrir card para comentar" : "Adicionar nota rápida"}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        {displayCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full text-[9px] h-3.5 min-w-3.5 px-0.5 flex items-center justify-center font-medium">
            {displayCount > 9 ? "9+" : displayCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-50 w-72 rounded-md border shadow-md p-2 space-y-2" style={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)" }}>
            <Textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma nota rápida..." className="min-h-20 text-sm" />
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={send} disabled={saving || !texto.trim()}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Enviar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
