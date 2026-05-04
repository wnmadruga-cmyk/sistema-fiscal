"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { etapasParaCard, LABEL_ETAPA_CURTO } from "@/lib/competencia-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CardItem } from "./CompetenciasPageContent";

export function InlineEtapas({ card, disabled }: { card: CardItem; disabled?: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmarProtocolo, setConfirmarProtocolo] = useState(false);
  // Optimistic: track locally-concluded etapas
  const [localConcluidas, setLocalConcluidas] = useState<Set<string>>(new Set());
  // Track failures to revert
  const [localFailed, setLocalFailed] = useState<Set<string>>(new Set());

  const statusByEtapa = new Map(card.etapas.map((e) => [e.etapa, e.status]));
  const exigirConf =
    card.empresa.exigirConferencia ||
    card.empresa.grupos.some((g) => g.grupo.exigirConferencia) ||
    card.conferenciaForcada;
  const exigirImpressao = !!card.empresa.entregaImpressa;
  const etapasVisiveis = etapasParaCard({ exigirConferencia: exigirConf, exigirImpressao });

  async function concluir(etapa: string) {
    if (disabled) return;
    if (etapa === "IMPRESSAO_PROTOCOLO") {
      setConfirmarProtocolo(true);
      return;
    }
    await _chamarConcluir(etapa);
  }

  async function _chamarConcluir(etapa: string) {
    // Optimistic: mark as concluded immediately
    setLocalConcluidas((prev) => new Set(prev).add(etapa));
    setLocalFailed((prev) => { const n = new Set(prev); n.delete(etapa); return n; });

    setBusy(etapa);
    const res = await fetch(`/api/competencias/${card.id}/etapas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa, status: "CONCLUIDA", inline: true }),
    });
    setBusy(null);

    if (!res.ok) {
      // Revert optimistic update
      setLocalConcluidas((prev) => { const n = new Set(prev); n.delete(etapa); return n; });
      setLocalFailed((prev) => new Set(prev).add(etapa));
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao concluir etapa");
      return;
    }
    toast.success("Etapa concluída");
    // Invalidate in background — no visible wait
    queryClient.invalidateQueries({ queryKey: ["competencias-page-data"] });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {etapasVisiveis.map((etapa) => {
          const st = statusByEtapa.get(etapa);
          const serverConcluida = st === "CONCLUIDA";
          const concluida = serverConcluida || localConcluidas.has(etapa);
          const failed = localFailed.has(etapa);
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
                  : failed
                  ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30"
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

      <Dialog open={confirmarProtocolo} onOpenChange={setConfirmarProtocolo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Confirmar Protocolo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Você já realizou a <strong>impressão</strong> e a entrega do <strong>protocolo</strong> para o cliente?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmarProtocolo(false)}>
              Não, ainda não
            </Button>
            <Button
              onClick={async () => {
                setConfirmarProtocolo(false);
                await _chamarConcluir("IMPRESSAO_PROTOCOLO");
              }}
            >
              Sim, protocolo realizado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
