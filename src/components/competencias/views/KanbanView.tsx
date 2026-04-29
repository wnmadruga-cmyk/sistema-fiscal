"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { LABEL_ETAPA, ORDEM_ETAPAS } from "@/lib/competencia-utils";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { CardItem } from "../CompetenciasPageContent";
import type { EtapaCard } from "@prisma/client";

interface KanbanViewProps {
  cards: CardItem[];
}

const ETAPA_COLUMN_COLORS: Record<EtapaCard, string> = {
  BUSCA_DOCUMENTOS: "border-t-slate-400",
  CONFERENCIA_APURACAO: "border-t-blue-400",
  CONFERENCIA: "border-t-indigo-400",
  TRANSMISSAO: "border-t-amber-400",
  ENVIO: "border-t-orange-400",
  ENVIO_ACESSORIAS: "border-t-cyan-400",
  IMPRESSAO_PROTOCOLO: "border-t-purple-400",
  CONCLUIDO: "border-t-emerald-400",
};

export function KanbanView({ cards }: KanbanViewProps) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);

  const cardsPorEtapa = ORDEM_ETAPAS.reduce(
    (acc, etapa) => {
      acc[etapa] = cards.filter((c) => c.etapaAtual === etapa);
      return acc;
    },
    {} as Record<EtapaCard, CardItem[]>
  );

  async function handleDrop(cardId: string, novaEtapa: EtapaCard) {
    const res = await fetch(`/api/competencias/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaAtual: novaEtapa }),
    });

    if (!res.ok) {
      toast.error("Erro ao mover card");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {ORDEM_ETAPAS.map((etapa) => {
        const colCards = cardsPorEtapa[etapa] ?? [];
        return (
          <div
            key={etapa}
            className={`flex flex-col gap-3 min-w-[260px] w-[260px] shrink-0`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const cardId = e.dataTransfer.getData("cardId");
              if (cardId) {
                handleDrop(cardId, etapa);
              }
              setDragging(null);
            }}
          >
            {/* Column header */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg border-t-2 bg-muted/50 ${ETAPA_COLUMN_COLORS[etapa]}`}
            >
              <span className="text-sm font-medium">{LABEL_ETAPA[etapa]}</span>
              <Badge variant="secondary" className="text-xs">
                {colCards.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {colCards.map((card) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  onDragStart={() => setDragging(card.id)}
                  onDragEnd={() => setDragging(null)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  card,
  onDragStart,
  onDragEnd,
}: {
  card: CardItem;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("cardId", card.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        card.urgente ? "border-red-200 dark:border-red-900" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {card.urgente && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <p className="text-sm font-medium truncate">
              {card.empresa.codigoInterno && (
                <span className="text-muted-foreground font-mono mr-1">{card.empresa.codigoInterno}</span>
              )}
              {card.empresa.razaoSocial}
            </p>
          </div>
          {card.empresa.regimeTributario && (
            <Badge variant="secondary" className="text-xs">
              {card.empresa.regimeTributario.codigo}
            </Badge>
          )}
        </div>
      </div>

      {card.semMovimentoMesAnterior && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1">
          Sem movimento anterior
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {card.responsavel && (
            <UserAvatar
              nome={card.responsavel.nome}
              avatar={card.responsavel.avatar}
              size="sm"
            />
          )}
          {(card._count?.comentarios ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {card._count?.comentarios}
            </span>
          )}
        </div>
        <Link
          href={`/competencias/${card.id}`}
          className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          Abrir →
        </Link>
      </div>
    </div>
  );
}
