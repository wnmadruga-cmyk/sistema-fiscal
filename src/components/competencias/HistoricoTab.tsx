"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDateTime } from "@/lib/utils";
import { Loader2, History } from "lucide-react";
import type { TipoEventoCard } from "@prisma/client";

type Evento = {
  id: string;
  tipo: TipoEventoCard;
  titulo: string;
  detalhes: string | null;
  createdAt: string;
  usuario: { id: string; nome: string; avatar: string | null } | null;
};

const TIPO_COR: Partial<Record<TipoEventoCard, string>> = {
  CRIADO: "bg-slate-500",
  ETAPA_INICIADA: "bg-blue-500",
  ETAPA_CONCLUIDA: "bg-emerald-500",
  ETAPA_REPROVADA: "bg-red-500",
  CONFERENCIA_APROVADA: "bg-emerald-600",
  CONFERENCIA_RESSALVA: "bg-amber-500",
  CONFERENCIA_REPROVADA: "bg-red-600",
  RESSALVA_RESOLVIDA: "bg-emerald-500",
  COMENTARIO: "bg-indigo-500",
  OBSERVACAO: "bg-violet-500",
  ETIQUETA_ALTERADA: "bg-pink-500",
  URGENTE_MARCADO: "bg-red-500",
  URGENTE_REMOVIDO: "bg-slate-400",
  SEM_MOVIMENTO_MARCADO: "bg-slate-500",
  SEM_MOVIMENTO_REMOVIDO: "bg-slate-400",
  RESPONSAVEL_ALTERADO: "bg-cyan-500",
  QUALIDADE_REGISTRADA: "bg-red-600",
  CHECKLIST_MARCADO: "bg-emerald-400",
  OUTRO: "bg-muted",
};

export function HistoricoTab({ cardId }: { cardId: string }) {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/competencias/${cardId}/eventos`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return;
        setEventos(j.data ?? j ?? []);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [cardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (!eventos || eventos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Nenhum evento registrado ainda.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
      <div className="space-y-4">
        {eventos.map((e) => (
          <div key={e.id} className="relative">
            <span className={`absolute -left-[18px] top-1.5 w-3 h-3 rounded-full ring-2 ring-background ${TIPO_COR[e.tipo] ?? "bg-muted"}`} />
            <div className="flex items-start gap-2">
              {e.usuario && (
                <UserAvatar nome={e.usuario.nome} avatar={e.usuario.avatar} size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{e.titulo}</p>
                {e.detalhes && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words mt-0.5">{e.detalhes}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {e.usuario?.nome ?? "Sistema"} · {formatDateTime(e.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
