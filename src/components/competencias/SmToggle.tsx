"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SmToggle({
  cardId,
  semMovimento,
  disabled,
}: {
  cardId: string;
  semMovimento: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  // Local state for optimistic update
  const [localSm, setLocalSm] = useState(semMovimento);

  // Sync when parent re-renders with fresh data (after query invalidation)
  useEffect(() => {
    if (!busy) setLocalSm(semMovimento);
  }, [semMovimento, busy]);

  async function toggle() {
    if (disabled) return;
    const next = !localSm;
    setLocalSm(next); // optimistic: change color immediately
    setBusy(true);
    const res = await fetch(`/api/competencias/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semMovimento: next, inline: true }),
    });
    setBusy(false);
    if (!res.ok) {
      setLocalSm(!next); // revert
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro");
      return;
    }
    // Invalidate in background — no visible wait
    queryClient.invalidateQueries({ queryKey: ["competencias-page-data"] });
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled || busy}
      title={localSm ? "Sem Movimento" : "Marcar Sem Movimento"}
      className={`inline-flex items-center justify-center h-6 px-2 rounded text-[10px] font-medium border transition-colors ${
        localSm
          ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400"
          : disabled
          ? "border-muted text-muted-foreground/50 cursor-not-allowed"
          : "border-input hover:bg-muted"
      }`}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "SM"}
    </button>
  );
}
