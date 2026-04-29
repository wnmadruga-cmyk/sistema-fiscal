"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LABEL_ETAPA } from "@/lib/competencia-utils";
import { formatDate } from "@/lib/utils";
import type { EtapaCard } from "@prisma/client";

type EtapaData = {
  etapa: EtapaCard;
  status: string;
  observacao: string | null;
  justificativa: string | null;
  iniciadoEm: Date | null;
  concluidoEm: Date | null;
};

export function EtapaReadOnlyModal({
  etapa,
  open,
  onOpenChange,
}: {
  etapa: EtapaData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!etapa) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {LABEL_ETAPA[etapa.etapa]}
            <Badge variant={etapa.status === "CONCLUIDA" ? "default" : "secondary"}>{etapa.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Iniciado em</p>
              <p>{etapa.iniciadoEm ? formatDate(etapa.iniciadoEm) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Concluído em</p>
              <p>{etapa.concluidoEm ? formatDate(etapa.concluidoEm) : "—"}</p>
            </div>
          </div>
          {etapa.observacao && (
            <div>
              <p className="text-xs text-muted-foreground">Observação</p>
              <p className="whitespace-pre-wrap border rounded p-2 bg-muted/30">{etapa.observacao}</p>
            </div>
          )}
          {etapa.justificativa && (
            <div>
              <p className="text-xs text-muted-foreground">Justificativa</p>
              <p className="whitespace-pre-wrap border rounded p-2 bg-muted/30">{etapa.justificativa}</p>
            </div>
          )}
          {!etapa.observacao && !etapa.justificativa && (
            <p className="text-xs text-muted-foreground italic">Sem observações registradas.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
