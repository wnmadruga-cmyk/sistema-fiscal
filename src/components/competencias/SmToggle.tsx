"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (disabled) return;
    setBusy(true);
    const res = await fetch(`/api/competencias/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semMovimento: !semMovimento, inline: true }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled || busy}
      title={semMovimento ? "Sem Movimento" : "Marcar Sem Movimento"}
      className={`inline-flex items-center justify-center h-6 px-2 rounded text-[10px] font-medium border transition-colors ${
        semMovimento
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
