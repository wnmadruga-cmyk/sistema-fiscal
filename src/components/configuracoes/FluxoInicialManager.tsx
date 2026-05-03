"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Building2, Globe, Mail, FileText, Pause } from "lucide-react";

type EtapaCard =
  | "BUSCA_DOCUMENTOS"
  | "BAIXAR_NOTAS_ACESSO"
  | "PEDIR_NOTAS_RECEITA_PR"
  | "POSSIVEIS_SEM_MOVIMENTO"
  | "CONFERENCIA_APURACAO"
  | "CONFERENCIA"
  | "TRANSMISSAO"
  | "ENVIO"
  | "ENVIO_ACESSORIAS"
  | "IMPRESSAO_PROTOCOLO"
  | "CONCLUIDO";

type TipoRegraFluxo =
  | "ORIGEM_ESCRITORIO"
  | "ORIGEM_TERCEIROS_ACESSO"
  | "ORIGEM_RECEITA_PR"
  | "ORIGEM_EMAIL_WHATSAPP"
  | "SEM_MOVIMENTO_TEMP";

interface RegraFluxoInicial {
  id: string;
  tipo: TipoRegraFluxo;
  etapaInicial: EtapaCard;
  ativo: boolean;
}

const ETAPAS: { value: EtapaCard; label: string }[] = [
  { value: "BUSCA_DOCUMENTOS",        label: "Busca de Documentos" },
  { value: "BAIXAR_NOTAS_ACESSO",     label: "Baixar Notas Acesso Sistema" },
  { value: "PEDIR_NOTAS_RECEITA_PR",  label: "Pedir Notas Receita PR" },
  { value: "POSSIVEIS_SEM_MOVIMENTO", label: "Possíveis Sem Movimento" },
  { value: "CONFERENCIA_APURACAO",    label: "Conferência e Apuração" },
  { value: "CONFERENCIA",             label: "Conferência" },
  { value: "TRANSMISSAO",             label: "Transmissão" },
  { value: "ENVIO",                   label: "Envio" },
  { value: "ENVIO_ACESSORIAS",        label: "Enviado via Acessorias" },
  { value: "IMPRESSAO_PROTOCOLO",     label: "Impressão e Protocolo" },
  { value: "CONCLUIDO",               label: "Concluído" },
];

const REGRAS_CONFIG: {
  tipo: TipoRegraFluxo;
  label: string;
  descricao: string;
  icon: React.ComponentType<{ className?: string }>;
  categoria: "nf" | "operacional";
}[] = [
  {
    tipo: "ORIGEM_ESCRITORIO",
    label: "Origem: Escritório",
    descricao: "NFs com origem marcada como 'Escritório' — documentos gerados pelo próprio escritório.",
    icon: Building2,
    categoria: "nf",
  },
  {
    tipo: "ORIGEM_TERCEIROS_ACESSO",
    label: "Origem: Software de Terceiro / Acesso ao Sistema",
    descricao: "NFs com origem 'Terceiros' via acesso ao sistema ou software do cliente.",
    icon: Globe,
    categoria: "nf",
  },
  {
    tipo: "ORIGEM_RECEITA_PR",
    label: "Origem: Receita-PR",
    descricao: "NFs cujos documentos chegam via portal da Receita-PR.",
    icon: FileText,
    categoria: "nf",
  },
  {
    tipo: "ORIGEM_EMAIL_WHATSAPP",
    label: "Origem: E-mail / WhatsApp",
    descricao: "NFs cujos documentos chegam por e-mail ou WhatsApp.",
    icon: Mail,
    categoria: "nf",
  },
  {
    tipo: "SEM_MOVIMENTO_TEMP",
    label: "Sem Movimento Temporário",
    descricao: "Empresas marcadas como 'Sem Movimento Temporário' no operacional.",
    icon: Pause,
    categoria: "operacional",
  },
];

export function FluxoInicialManager({ initial }: { initial: RegraFluxoInicial[] }) {
  const router = useRouter();

  // Map tipo → etapaInicial (null = sem regra)
  const [valores, setValores] = useState<Partial<Record<TipoRegraFluxo, EtapaCard | null>>>(() => {
    const m: Partial<Record<TipoRegraFluxo, EtapaCard | null>> = {};
    for (const r of initial) {
      m[r.tipo] = r.etapaInicial;
    }
    return m;
  });

  const [saving, setSaving] = useState<TipoRegraFluxo | null>(null);

  async function salvar(tipo: TipoRegraFluxo, etapaInicial: EtapaCard | null) {
    setSaving(tipo);
    const res = await fetch("/api/configuracoes/fluxo-inicial", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, etapaInicial }),
    });
    setSaving(null);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    toast.success("Configuração salva!");
    router.refresh();
  }

  function handleChange(tipo: TipoRegraFluxo, valor: string) {
    const etapa = valor === "__none__" ? null : (valor as EtapaCard);
    setValores((v) => ({ ...v, [tipo]: etapa }));
    salvar(tipo, etapa);
  }

  const nfRegras = REGRAS_CONFIG.filter((r) => r.categoria === "nf");
  const operacionalRegras = REGRAS_CONFIG.filter((r) => r.categoria === "operacional");

  function renderRegra(config: (typeof REGRAS_CONFIG)[0]) {
    const Icon = config.icon;
    const valor = valores[config.tipo];
    const isSaving = saving === config.tipo;

    return (
      <Card key={config.tipo} className="border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  {config.label}
                  {valor ? (
                    <Badge variant="secondary" className="text-xs">
                      Inicia em: {ETAPAS.find((e) => e.value === valor)?.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Padrão (Busca de Documentos)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{config.descricao}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Select
                value={valor ?? "__none__"}
                onValueChange={(v) => handleChange(config.tipo, v)}
                disabled={isSaving}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Etapa inicial..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Padrão (Busca de Documentos)</span>
                  </SelectItem>
                  {ETAPAS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Aviso sobre prioridade */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Prioridade de regras:</strong> Se a empresa estiver em um grupo com etapa inicial configurada, essa configuração prevalece sobre todas as demais. As regras abaixo se aplicam quando não há grupo com etapa inicial definida.
        </p>
      </div>

      {/* Seção: Notas Fiscais */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Notas Fiscais — Origem dos Documentos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define em qual etapa o fluxo inicia conforme a origem configurada nas NFs da empresa.
          </p>
        </div>
        <div className="space-y-3">
          {nfRegras.map(renderRegra)}
        </div>
      </div>

      {/* Seção: Operacional */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Operacional</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define em qual etapa o fluxo inicia para empresas com condições operacionais especiais.
          </p>
        </div>
        <div className="space-y-3">
          {operacionalRegras.map(renderRegra)}
        </div>
      </div>

      <div className="text-xs text-muted-foreground border-t pt-4">
        As etapas anteriores à etapa inicial serão automaticamente marcadas como concluídas na geração da competência.
        As configurações de grupo são definidas em{" "}
        <a href="/configuracoes/grupos" className="underline">Configurações → Grupos</a>.
      </div>
    </div>
  );
}
