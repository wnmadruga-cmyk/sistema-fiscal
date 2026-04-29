"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

export type ColumnKey =
  | "empresa"
  | "etiquetas"
  | "regime"
  | "tipoAtividade"
  | "prioridade"
  | "filial"
  | "grupos"
  | "respElaboracao"
  | "respConferencia"
  | "configEntrega"
  | "etapa"
  | "etapasInline"
  | "progresso"
  | "prazo"
  | "responsavel"
  | "acoes"
  // Campos avançados
  | "situacaoFolha"
  | "fatorR"
  | "fechaAutomatico"
  | "clienteBusca"
  | "escritorioEntrega"
  | "entregaImpressa"
  | "entregaDigisac"
  | "semMovimentoTemp"
  | "diaVencimentoHonorarios";

export const DEFAULT_COLUMNS: ColumnKey[] = [
  "empresa",
  "etiquetas",
  "regime",
  "etapasInline",
  "prazo",
  "responsavel",
  "acoes",
];

const ALL_COLUMNS: { key: ColumnKey; label: string; group?: string }[] = [
  { key: "empresa", label: "Empresa" },
  { key: "etiquetas", label: "Etiquetas" },
  { key: "regime", label: "Regime" },
  { key: "tipoAtividade", label: "Tipo Atividade" },
  { key: "prioridade", label: "Prioridade" },
  { key: "filial", label: "Escritório" },
  { key: "grupos", label: "Grupos" },
  { key: "respElaboracao", label: "Resp. Elaboração" },
  { key: "respConferencia", label: "Resp. Conferência" },
  { key: "configEntrega", label: "Config. Entrega" },
  { key: "etapa", label: "Etapa atual" },
  { key: "etapasInline", label: "Etapas (inline)" },
  { key: "progresso", label: "Progresso" },
  { key: "prazo", label: "Prazo" },
  { key: "responsavel", label: "Responsável" },
  { key: "acoes", label: "Ações" },
  // Campos avançados
  { key: "situacaoFolha", label: "Folha", group: "Avançado" },
  { key: "diaVencimentoHonorarios", label: "Dia Venc. Honorários", group: "Avançado" },
  { key: "fatorR", label: "Fator R", group: "Avançado" },
  { key: "fechaAutomatico", label: "Fecha Automático", group: "Avançado" },
  { key: "clienteBusca", label: "Cliente Busca", group: "Avançado" },
  { key: "escritorioEntrega", label: "Escritório Entrega", group: "Avançado" },
  { key: "entregaImpressa", label: "Entrega Impressa", group: "Avançado" },
  { key: "entregaDigisac", label: "Entrega Digisac", group: "Avançado" },
  { key: "semMovimentoTemp", label: "Sem Movimento Temp.", group: "Avançado" },
];

export function ColumnConfigPopover({
  columns,
  onChange,
}: {
  columns: Set<ColumnKey>;
  onChange: (next: Set<ColumnKey>) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(k: ColumnKey) {
    const n = new Set(columns);
    if (n.has(k)) n.delete(k); else n.add(k);
    onChange(n);
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setOpen((v) => !v)}>
        <Settings2 className="h-3.5 w-3.5" /> Colunas
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-64 rounded-md border bg-popover text-popover-foreground shadow-md p-2" style={{ backgroundColor: "var(--popover)" }}>
            <p className="text-xs font-medium px-2 py-1 text-muted-foreground">Colunas visíveis</p>
            <div className="max-h-80 overflow-y-auto">
              {ALL_COLUMNS.map((c, i) => {
                const prevGroup = i > 0 ? ALL_COLUMNS[i - 1].group : undefined;
                const showSep = c.group && c.group !== prevGroup;
                return (
                  <div key={c.key}>
                    {showSep && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide px-2 pt-2 pb-1 text-muted-foreground">
                        {c.group}
                      </p>
                    )}
                    <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                      <input type="checkbox" checked={columns.has(c.key)} onChange={() => toggle(c.key)} />
                      {c.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
