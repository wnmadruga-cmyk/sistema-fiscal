import { Badge } from "@/components/ui/badge";
import type { StatusCard, EtapaCard } from "@prisma/client";
import { LABEL_ETAPA } from "@/lib/competencia-utils";

const STATUS_CONFIG: Record<
  StatusCard,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline" }
> = {
  PENDENTE: { label: "Pendente", variant: "secondary" },
  EM_ANDAMENTO: { label: "Em Andamento", variant: "info" },
  AGUARDANDO: { label: "Aguardando", variant: "warning" },
  CONCLUIDO: { label: "Concluído", variant: "success" },
  CANCELADO: { label: "Cancelado", variant: "destructive" },
};

export function StatusCardBadge({ status }: { status: StatusCard }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function EtapaBadge({ etapa }: { etapa: EtapaCard }) {
  return (
    <Badge variant="outline" className="text-xs">
      {LABEL_ETAPA[etapa]}
    </Badge>
  );
}
