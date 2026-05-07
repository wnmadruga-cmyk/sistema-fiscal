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
import { toast } from "sonner";
import { Loader2, Building2, Globe, Mail, FileText, Pause } from "lucide-react";

type EtapaCard =
  | "BUSCA_DOCUMENTOS"
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
  etiquetaId: string | null;
  ativo: boolean;
}

interface EtiquetaOpt {
  id: string;
  nome: string;
  cor: string;
}

const ETAPAS: { value: EtapaCard; label: string }[] = [
  { value: "BUSCA_DOCUMENTOS",     label: "Busca de Documentos" },
  { value: "CONFERENCIA_APURACAO", label: "Conferência e Apuração" },
  { value: "CONFERENCIA",          label: "Conferência" },
  { value: "TRANSMISSAO",          label: "Transmissão" },
  { value: "ENVIO",                label: "Envio" },
  { value: "ENVIO_ACESSORIAS",     label: "Enviado via Acessorias" },
  { value: "IMPRESSAO_PROTOCOLO",  label: "Impressão e Protocolo" },
  { value: "CONCLUIDO",            label: "Concluído" },
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

export function FluxoInicialManager({
  initial,
  etiquetas,
}: {
  initial: RegraFluxoInicial[];
  etiquetas: EtiquetaOpt[];
}) {
  const router = useRouter();

  const [valores, setValores] = useState<Partial<Record<TipoRegraFluxo, EtapaCard | null>>>(() => {
    const m: Partial<Record<TipoRegraFluxo, EtapaCard | null>> = {};
    for (const r of initial) m[r.tipo] = r.etapaInicial;
    return m;
  });

  const [etiquetas_, setEtiquetas_] = useState<Partial<Record<TipoRegraFluxo, string | null>>>(() => {
    const m: Partial<Record<TipoRegraFluxo, string | null>> = {};
    for (const r of initial) m[r.tipo] = r.etiquetaId;
    return m;
  });

  const [saving, setSaving] = useState<TipoRegraFluxo | null>(null);

  async function salvar(tipo: TipoRegraFluxo, etapaInicial: EtapaCard | null, etiquetaId?: string | null) {
    setSaving(tipo);
    const res = await fetch("/api/configuracoes/fluxo-inicial", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, etapaInicial, etiquetaId: etiquetaId ?? null }),
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

  function handleEtapaChange(tipo: TipoRegraFluxo, valor: string) {
    const etapa = valor === "__none__" ? null : (valor as EtapaCard);
    setValores((v) => ({ ...v, [tipo]: etapa }));
    salvar(tipo, etapa, etiquetas_[tipo]);
  }

  function handleEtiquetaChange(tipo: TipoRegraFluxo, valor: string) {
    const etiquetaId = valor === "__none__" ? null : valor;
    setEtiquetas_((v) => ({ ...v, [tipo]: etiquetaId }));
    salvar(tipo, valores[tipo] ?? "BUSCA_DOCUMENTOS", etiquetaId);
  }

  const nfRegras = REGRAS_CONFIG.filter((r) => r.categoria === "nf");
  const operacionalRegras = REGRAS_CONFIG.filter((r) => r.categoria === "operacional");

  function renderRegra(config: (typeof REGRAS_CONFIG)[0]) {
    const Icon = config.icon;
    const etapa = valores[config.tipo];
    const etiquetaId = etiquetas_[config.tipo];
    const etiquetaSel = etiquetas.find((e) => e.id === etiquetaId);
    const isSaving = saving === config.tipo;

    return (
      <Card key={config.tipo} className="border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  {config.label}
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{config.descricao}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pl-11">
              {/* Etapa inicial */}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Etapa inicial</p>
                <Select
                  value={etapa ?? "__none__"}
                  onValueChange={(v) => handleEtapaChange(config.tipo, v)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-8 text-sm">
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

              {/* Etiqueta a atribuir */}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Etiqueta automática</p>
                <Select
                  value={etiquetaId ?? "__none__"}
                  onValueChange={(v) => handleEtiquetaChange(config.tipo, v)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Nenhuma etiqueta">
                      {etiquetaSel ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 inline-block"
                            style={{ backgroundColor: etiquetaSel.cor }}
                          />
                          {etiquetaSel.nome}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Nenhuma etiqueta</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Nenhuma etiqueta</span>
                    </SelectItem>
                    {etiquetas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 inline-block"
                            style={{ backgroundColor: e.cor }}
                          />
                          {e.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
