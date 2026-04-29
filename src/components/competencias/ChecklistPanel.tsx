"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { EtapaCard, ChecklistTemplate, ChecklistItem } from "@prisma/client";

type Resposta = {
  id: string;
  marcado: boolean;
  observacao: string | null;
  item: ChecklistItem;
  usuario: { id: string; nome: string };
};

type EtapaComRespostas = {
  id: string;
  etapa: EtapaCard;
  respostas: Resposta[];
};

interface Props {
  cardId: string;
  etapa: EtapaCard;
  cardEtapas: EtapaComRespostas[];
  checklists: (ChecklistTemplate & { itens: ChecklistItem[] })[];
}

const ESCOPO_LABEL: Record<string, string> = {
  GLOBAL: "Global",
  GRUPO: "Grupo",
  EMPRESA: "Empresa",
};

export function ChecklistPanel({ cardId, etapa, cardEtapas, checklists }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const cardEtapa = cardEtapas.find((e) => e.etapa === etapa);
  const templates = checklists.filter((c) => c.etapa === etapa);

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">Nenhum checklist configurado para esta etapa.</p>
    );
  }

  if (!cardEtapa) {
    return <p className="text-sm text-muted-foreground italic">Etapa não inicializada.</p>;
  }

  const respostasMap = new Map(cardEtapa.respostas.map((r) => [r.item.id, r]));

  async function toggle(itemId: string, marcado: boolean) {
    if (!cardEtapa) return;
    const key = `${cardEtapa.id}:${itemId}`;
    setBusyKey(key);
    const res = await fetch(`/api/competencias/${cardId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaId: cardEtapa.id, itemId, marcado }),
    });
    setBusyKey(null);
    if (!res.ok) {
      toast.error("Erro ao atualizar");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {templates.map((tpl) => {
        const itens = tpl.itens;
        const marcadosCount = itens.filter((i) => respostasMap.get(i.id)?.marcado).length;
        const obrigatoriosPendentes = itens.some((i) => i.obrigatorio && !respostasMap.get(i.id)?.marcado);

        return (
          <div key={tpl.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{tpl.nome}</p>
                  <Badge variant="secondary" className="text-[10px]">{ESCOPO_LABEL[tpl.escopo]}</Badge>
                  {tpl.obrigatorio && (
                    <Badge variant="warning" className="text-[10px]">Obrigatório</Badge>
                  )}
                </div>
                {tpl.descricao && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.descricao}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {marcadosCount}/{itens.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {itens.map((item) => {
                const resp = respostasMap.get(item.id);
                const checked = resp?.marcado ?? false;
                const key = `${cardEtapa.id}:${item.id}`;
                const busy = busyKey === key || pending;
                return (
                  <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5"
                      checked={checked}
                      disabled={busy}
                      onChange={(e) => toggle(item.id, e.target.checked)}
                    />
                    <div className="flex-1">
                      <span className={`text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
                        {item.texto}
                        {item.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      {item.descricao && (
                        <p className="text-xs text-muted-foreground">{item.descricao}</p>
                      )}
                      {resp?.usuario && checked && (
                        <p className="text-[10px] text-muted-foreground">por {resp.usuario.nome}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {tpl.obrigatorio && obrigatoriosPendentes && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Itens obrigatórios pendentes
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
