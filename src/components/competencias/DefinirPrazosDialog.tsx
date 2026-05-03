"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { competenciaLabel } from "@/lib/competencia-utils";

interface Prioridade {
  id: string;
  nome: string;
  cor: string;
  diasPrazo: number;
}

interface EtapaConfigItem {
  etapa: string;
  diasPrazo: number | null;
}

export interface PrazosCalculados {
  competencia: string;
  prazos: Record<string, string>; // prioridadeId → "YYYY-MM-DD"
  etapas: Record<string, string>; // etapa → "YYYY-MM-DD"
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competencia: string; // valor inicial (da página)
  prioridades: Prioridade[];
  etapasConfig: EtapaConfigItem[];
  onConfirm: (data: PrazosCalculados) => void;
}

// Etapas elegíveis para prazo (do fluxo inicial até Conferência e Apuração)
const ETAPAS_PARA_PRAZO = new Set([
  "BUSCA_DOCUMENTOS",
  "BAIXAR_NOTAS_ACESSO",
  "PEDIR_NOTAS_RECEITA_PR",
  "POSSIVEIS_SEM_MOVIMENTO",
  "CONFERENCIA_APURACAO",
]);

const ETAPA_NOME: Record<string, string> = {
  BUSCA_DOCUMENTOS: "Busca de Documentos",
  BAIXAR_NOTAS_ACESSO: "Baixar Notas Acesso Sistema",
  PEDIR_NOTAS_RECEITA_PR: "Pedir Notas Receita PR",
  POSSIVEIS_SEM_MOVIMENTO: "Possíveis Sem Movimento",
  CONFERENCIA_APURACAO: "Conferência e Apuração",
};

function proxDiaUtil(date: Date, feriados: Set<string>): Date {
  const d = new Date(date);
  while (true) {
    const dow = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !feriados.has(iso)) break;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function calcData(competencia: string, dias: number, feriados: Set<string>): string {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = parseInt(anoStr);
  const mes = parseInt(mesStr);
  const base = new Date(Date.UTC(ano, mes, 0)); // último dia do mês
  base.setUTCDate(base.getUTCDate() + dias);
  const ajustado = proxDiaUtil(base, feriados);
  return ajustado.toISOString().slice(0, 10);
}

export function DefinirPrazosDialog({
  open,
  onOpenChange,
  competencia: competenciaInicial,
  prioridades,
  etapasConfig,
  onConfirm,
}: Props) {
  const [comp, setComp] = useState(competenciaInicial);
  const [loading, setLoading] = useState(false);
  const [prazos, setPrazos] = useState<Record<string, string>>({});
  const [etapas, setEtapas] = useState<Record<string, string>>({});
  const [calculadoPara, setCalculadoPara] = useState<string | null>(null);

  const etapasComPrazo = etapasConfig.filter(
    (e) => e.diasPrazo != null && ETAPAS_PARA_PRAZO.has(e.etapa)
  );

  const isCompValida = /^\d{4}-\d{2}$/.test(comp);

  const calcular = useCallback(async (competencia: string) => {
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      toast.error("Competência inválida. Use o formato AAAA-MM.");
      return;
    }
    setLoading(true);
    try {
      const ano = competencia.split("-")[0];
      let feriados = new Set<string>();
      try {
        const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
        if (res.ok) {
          const lista = (await res.json()) as Array<{ date: string }>;
          feriados = new Set(lista.map((f) => f.date));
        }
      } catch {
        toast.warning("Não foi possível buscar os feriados nacionais. Datas calculadas sem feriados.");
      }

      const novosPrazos: Record<string, string> = {};
      for (const p of prioridades) {
        novosPrazos[p.id] = calcData(competencia, p.diasPrazo, feriados);
      }
      setPrazos(novosPrazos);

      const novasEtapas: Record<string, string> = {};
      for (const e of etapasComPrazo) {
        if (e.diasPrazo != null) {
          novasEtapas[e.etapa] = calcData(competencia, e.diasPrazo, feriados);
        }
      }
      setEtapas(novasEtapas);
      setCalculadoPara(competencia);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prioridades.length, etapasComPrazo.length]);

  // Reset ao fechar
  function handleOpenChange(v: boolean) {
    if (!v) {
      setComp(competenciaInicial);
      setPrazos({});
      setEtapas({});
      setCalculadoPara(null);
    }
    onOpenChange(v);
  }

  const calculado = calculadoPara === comp && Object.keys(prazos).length > 0;

  function confirmar() {
    onConfirm({ competencia: comp, prazos, etapas });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calcular Prazos do Mês
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Competência */}
          <div className="space-y-1">
            <Label>Competência (AAAA-MM)</Label>
            <div className="flex gap-2">
              <Input
                value={comp}
                onChange={(e) => {
                  setComp(e.target.value);
                  setCalculadoPara(null);
                }}
                placeholder="2026-04"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => calcular(comp)}
                disabled={loading || !isCompValida}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loading ? "Calculando..." : calculado ? "Recalcular" : "Calcular"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Informe a competência e clique em Calcular. As datas são ajustadas para o próximo dia útil (sem fds e feriados nacionais).
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Buscando feriados nacionais...
            </div>
          )}

          {!loading && calculado && (
            <>
              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                Prazos calculados para <strong>{competenciaLabel(comp)}</strong>. Ajuste as datas se necessário.
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Prazo por Prioridade</h3>
                <div className="grid gap-2">
                  {prioridades.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: p.cor }}
                      />
                      <Label className="w-32 shrink-0 text-sm">{p.nome}</Label>
                      <Input
                        type="date"
                        value={prazos[p.id] ?? ""}
                        onChange={(e) =>
                          setPrazos((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="h-8 text-sm flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {etapasComPrazo.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Prazo por Etapa</h3>
                  <p className="text-xs text-muted-foreground">
                    Etapas com prazo configurado (até Conferência e Apuração)
                  </p>
                  <div className="grid gap-2">
                    {etapasComPrazo.map((e) => (
                      <div key={e.etapa} className="flex items-center gap-3">
                        <Label className="w-48 shrink-0 text-sm">
                          {ETAPA_NOME[e.etapa] ?? e.etapa}
                        </Label>
                        <Input
                          type="date"
                          value={etapas[e.etapa] ?? ""}
                          onChange={(ev) =>
                            setEtapas((prev) => ({ ...prev, [e.etapa]: ev.target.value }))
                          }
                          className="h-8 text-sm flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={loading || !calculado}>
            Confirmar Prazos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
