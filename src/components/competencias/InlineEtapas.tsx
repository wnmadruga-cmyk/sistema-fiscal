"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { etapasParaCard, LABEL_ETAPA_CURTO } from "@/lib/competencia-utils";
import type { CardItem } from "./CompetenciasPageContent";

export function InlineEtapas({ card, disabled }: { card: CardItem; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const statusByEtapa = new Map(card.etapas.map((e) => [e.etapa, e.status]));
  const exigirConf =
    card.empresa.exigirConferencia ||
    card.empresa.grupos.some((g) => g.grupo.exigirConferencia) ||
    card.conferenciaForcada;
  const exigirImpressao = !!card.empresa.entregaImpressa;
  const etapasVisiveis = etapasParaCard({ exigirConferencia: exigirConf, exigirImpressao });

  async function concluir(etapa: string) {
    if (disabled) return;
    setBusy(etapa);
    const res = await fetch(`/api/competencias/${card.id}/etapas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa, status: "CONCLUIDA", inline: true }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao concluir etapa");
      return;
    }
    toast.success("Etapa concluída");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      {etapasVisiveis.map((etapa) => {
        const st = statusByEtapa.get(etapa);
        const concluida = st === "CONCLUIDA";
        const isBusy = busy === etapa;
        return (
          <button
            key={etapa}
            disabled={disabled || concluida || isBusy}
            onClick={() => concluir(etapa)}
            title={LABEL_ETAPA_CURTO[etapa] ?? etapa}
            className={`inline-flex items-center justify-center h-6 px-2 rounded text-[10px] font-medium border transition-colors ${
              concluida
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400"
                : disabled
                ? "border-muted text-muted-foreground/50 cursor-not-allowed"
                : "border-input hover:bg-muted"
            }`}
          >
            {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : concluida ? <Check className="h-3 w-3 mr-0.5" /> : null}
            {LABEL_ETAPA_CURTO[etapa] ?? etapa}
          </button>
        );
      })}
    </div>
  );
}
