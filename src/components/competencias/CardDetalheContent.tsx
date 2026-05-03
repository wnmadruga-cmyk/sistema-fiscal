"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EtapaReadOnlyModal } from "./EtapaReadOnlyModal";
import { ConferenciaActions } from "./ConferenciaActions";
import { ErrosChecklist } from "./ErrosChecklist";
import { ExcluirCardButton } from "./ExcluirCardButton";
import { ChecklistPanel } from "./ChecklistPanel";
import { HistoricoTab } from "./HistoricoTab";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  MessageSquare,
  FileText,
  AlertOctagon,
  StickyNote,
  ChevronRight,
  Paperclip,
  Download,
  FileImage,
  File as FileIcon,
  Printer,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LABEL_ETAPA, ORDEM_ETAPAS, etapasParaCard, formatCompetencia } from "@/lib/competencia-utils";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type {
  CompetenciaCard,
  Empresa,
  ConfigDocumento,
  EtapaCard,
  CardEtapa,
  Comentario,
  Observacao,
  ControleQualidade,
  Usuario,
  ChecklistTemplate,
  ChecklistItem,
} from "@prisma/client";

type CardComRelacoes = Omit<CompetenciaCard, "notaQualidade"> & {
  notaQualidade: number | null;
  empresa: Empresa & {
    regimeTributario: { codigo: string; nome: string } | null;
    configDocumentos: ConfigDocumento[];
    configBuscas: { id: string; nome: string; url: string; login: string; ativo: boolean }[];
    grupos: Array<{ grupo: { id: string; nome: string; exigirConferencia: boolean } }>;
  };
  conferenciaResponsavel: { id: string; nome: string; avatar: string | null } | null;
  prioridade: { nome: string; cor: string } | null;
  responsavel: { id: string; nome: string; avatar: string | null; perfil: string } | null;
  etapas: (CardEtapa & {
    respostas: Array<{
      id: string;
      marcado: boolean;
      observacao: string | null;
      item: ChecklistItem;
      usuario: { id: string; nome: string };
    }>;
  })[];
  qualidade: (ControleQualidade & {
    responsavel: { id: string; nome: string; avatar: string | null };
  })[];
  observacoesCard: (Observacao & {
    autor: { id: string; nome: string; avatar: string | null };
  })[];
};

type ArquivoAnexo = {
  id: string;
  nome: string;
  nomeOriginal: string;
  tipo: string;
  tamanho: number;
  bucket: string;
  path: string;
};
type ComentarioComRelacoes = Comentario & {
  autor: { id: string; nome: string; avatar: string | null };
  mencoes: Array<{ usuario: { id: string; nome: string } }>;
  arquivos: ArquivoAnexo[];
  respostas: Array<Comentario & { autor: { id: string; nome: string; avatar: string | null } }>;
};

interface CardDetalheContentProps {
  card: CardComRelacoes;
  comentarios: ComentarioComRelacoes[];
  usuarios: { id: string; nome: string; avatar: string | null }[];
  checklists: (ChecklistTemplate & { itens: ChecklistItem[] })[];
  usuarioAtual: Usuario;
}

const ETAPAS_COM_DOCS = new Set<EtapaCard>([
  "BUSCA_DOCUMENTOS",
  "BAIXAR_NOTAS_ACESSO",
  "PEDIR_NOTAS_RECEITA_PR",
]);

const LABEL_TIPO_DOC: Record<string, string> = {
  NFE: "NF-e (55)",
  NFCE: "NFC-e (65)",
  CTE: "CT-e",
  NOTA_SERVICO: "NFS-e (Serviço)",
  RECIBO_ALUGUEL: "Recibo de Aluguel",
};

const ETAPA_ICONS: Record<EtapaCard, React.ElementType> = {
  BUSCA_DOCUMENTOS: FileText,
  BAIXAR_NOTAS_ACESSO: ChevronRight,
  PEDIR_NOTAS_RECEITA_PR: ChevronRight,
  POSSIVEIS_SEM_MOVIMENTO: ChevronRight,
  CONFERENCIA_APURACAO: CheckCircle,
  CONFERENCIA: CheckCircle,
  TRANSMISSAO: ChevronRight,
  ENVIO: ChevronRight,
  ENVIO_ACESSORIAS: ChevronRight,
  IMPRESSAO_PROTOCOLO: ChevronRight,
  CONCLUIDO: CheckCircle,
};

export function CardDetalheContent({
  card,
  comentarios: comentariosIniciais,
  usuarios,
  checklists,
  usuarioAtual,
}: CardDetalheContentProps) {
  const router = useRouter();
  const [urgente, setUrgente] = useState(card.urgente);
  const [semMovimento, setSemMovimento] = useState(card.semMovimento);
  const [readOnlyEtapa, setReadOnlyEtapa] = useState<typeof card.etapas[number] | null>(null);
  const [confirmarProtocolo, setConfirmarProtocolo] = useState(false);
  const [comentarios, setComentarios] = useState(comentariosIniciais);
  const [novoComentario, setNovoComentario] = useState("");
  const [novosArquivos, setNovosArquivos] = useState<File[]>([]);
  const [novaObservacao, setNovaObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Documentos marcados por etapa (optimistic)
  const [docsEtapa, setDocsEtapa] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const e of card.etapas) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m[e.etapa] = (e as any).documentosMarcados ?? [];
    }
    return m;
  });

  async function toggleDocumento(etapa: EtapaCard, tipo: string, estaMarcado: boolean) {
    const lista = docsEtapa[etapa] ?? [];
    const novaLista = estaMarcado
      ? lista.filter((d) => d !== tipo)
      : [...lista, tipo];
    setDocsEtapa((prev) => ({ ...prev, [etapa]: novaLista }));
    await fetch(`/api/competencias/${card.id}/etapas/documentos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa, tipoDocumento: tipo, marcado: !estaMarcado }),
    });
  }

  async function toggleUrgente(v: boolean) {
    setUrgente(v);
    await fetch(`/api/competencias/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urgente: v }),
    });
    toast.success(v ? "Marcado como urgente" : "Urgente removido");
  }

  async function toggleSemMovimento(v: boolean) {
    setSemMovimento(v);
    await fetch(`/api/competencias/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semMovimento: v }),
    });
    toast.success(v ? "Marcado sem movimento" : "Com movimento");
  }

  async function avancarEtapa(etapa: EtapaCard) {
    // Validar documentos fiscais
    if (ETAPAS_COM_DOCS.has(etapa)) {
      const docsAtivos = card.empresa.configDocumentos.filter((d) => d.ativo);
      if (docsAtivos.length > 0) {
        const marcados = docsEtapa[etapa] ?? [];
        const faltando = docsAtivos.filter((d) => !marcados.includes(d.tipoDocumento));
        if (faltando.length > 0) {
          toast.warning(
            `Marque os documentos fiscais antes de avançar: ${faltando
              .map((d) => LABEL_TIPO_DOC[d.tipoDocumento] ?? d.tipoDocumento)
              .join(", ")}`
          );
          return;
        }
      }
    }

    // Validar checklists obrigatórios
    const templatesEtapa = checklists.filter((c) => c.etapa === etapa && c.obrigatorio);
    const cardEtapaData = card.etapas.find((e) => e.etapa === etapa);
    const respostasMap = new Map((cardEtapaData?.respostas ?? []).map((r) => [r.item.id, r]));
    for (const tpl of templatesEtapa) {
      const itensFaltando = tpl.itens.filter((i) => i.obrigatorio && !respostasMap.get(i.id)?.marcado);
      if (itensFaltando.length > 0) {
        toast.warning(`Checklist "${tpl.nome}": preencha os itens obrigatórios antes de avançar.`);
        return;
      }
    }

    if (etapa === "IMPRESSAO_PROTOCOLO") {
      setConfirmarProtocolo(true);
      return;
    }
    await _chamarAvancarEtapa(etapa);
  }

  async function _chamarAvancarEtapa(etapa: EtapaCard) {
    const res = await fetch(`/api/competencias/${card.id}/etapas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa, status: "CONCLUIDA" }),
    });
    if (res.ok) {
      toast.success(`Etapa concluída!`);
      router.refresh();
    } else {
      toast.error("Erro ao avançar etapa");
    }
  }

  async function enviarComentario() {
    if (!novoComentario.trim() && novosArquivos.length === 0) return;
    setSubmitting(true);

    const mencoes = usuarios
      .filter((u) => novoComentario.includes(`@${u.nome.split(" ")[0]}`))
      .map((u) => u.id);

    const texto = novoComentario.trim() || "(anexo)";
    const res = await fetch(`/api/competencias/${card.id}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, mencoes }),
    });

    if (!res.ok) {
      toast.error("Erro ao enviar comentário");
      setSubmitting(false);
      return;
    }

    const { data: novo } = await res.json();
    let arquivos: ArquivoAnexo[] = [];

    if (novosArquivos.length > 0) {
      const fd = new FormData();
      novosArquivos.forEach((f) => fd.append("files", f));
      const upRes = await fetch(`/api/comentarios/${novo.id}/arquivos`, {
        method: "POST",
        body: fd,
      });
      if (upRes.ok) {
        const upJson = await upRes.json();
        arquivos = upJson.data ?? [];
      } else {
        const d = await upRes.json().catch(() => ({}));
        toast.error(d.error ?? "Erro ao enviar arquivos");
      }
    }

    setComentarios((prev) => [...prev, { ...novo, respostas: [], mencoes: [], arquivos }]);
    setNovoComentario("");
    setNovosArquivos([]);
    setSubmitting(false);
  }

  async function salvarObservacao() {
    if (!novaObservacao.trim()) return;

    const res = await fetch(`/api/competencias/${card.id}/observacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: novaObservacao, persistente: true }),
    });

    if (res.ok) {
      toast.success("Observação salva para próxima competência");
      setNovaObservacao("");
      router.refresh();
    } else {
      toast.error("Erro ao salvar observação");
    }
  }

  const exigirConf =
    card.empresa.exigirConferencia ||
    card.empresa.grupos.some((g) => g.grupo.exigirConferencia) ||
    card.conferenciaForcada;
  const exigirImpressao = !!card.empresa.entregaImpressa;
  const etapasVisiveis = etapasParaCard({ exigirConferencia: exigirConf, exigirImpressao });
  const etapaAtualIdx = etapasVisiveis.indexOf(card.etapaAtual);

  async function forcarConferencia() {
    const motivo = window.prompt("Informe o motivo da conferência forçada:");
    if (!motivo || !motivo.trim()) {
      toast.error("Motivo é obrigatório");
      return;
    }
    const res = await fetch(`/api/competencias/${card.id}/forcar-conferencia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    });
    if (res.ok) {
      toast.success("Conferência forçada criada");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao forçar conferência");
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">
                {card.empresa.codigoInterno && (
                  <span className="text-muted-foreground font-mono mr-2">{card.empresa.codigoInterno}</span>
                )}
                {card.empresa.razaoSocial}
              </h1>
              {card.urgente && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Urgente
                </Badge>
              )}
              {card.semMovimentoMesAnterior && (
                <Badge variant="warning">Sem mov. anterior</Badge>
              )}
              {card.empresa.regimeTributario && (
                <Badge variant="secondary">
                  {card.empresa.regimeTributario.codigo}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Competência:{" "}
              {new Date(card.ano, card.mes - 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={urgente} onCheckedChange={toggleUrgente} />
            <Label className="text-sm cursor-pointer">Urgente</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={semMovimento} onCheckedChange={toggleSemMovimento} />
            <Label className="text-sm cursor-pointer">Sem Movimento</Label>
          </div>
          {!card.empresa.exigirConferencia && !card.empresa.grupos.some((g) => g.grupo.exigirConferencia) && !card.conferenciaForcada && (
            <Button variant="outline" size="sm" onClick={forcarConferencia}>
              Forçar conferência
            </Button>
          )}
          {card.conferenciaForcada && (
            <Badge variant="warning" title={card.motivoConferencia ?? ""}>
              Conferência forçada
            </Badge>
          )}
          <ExcluirCardButton
            cardId={card.id}
            competencia={card.competencia}
            empresaNome={card.empresa.razaoSocial}
            redirectTo="/competencias"
          />
        </div>
      </div>

      {/* Progress bar de etapas */}
      <div className="border rounded-xl p-4 bg-card">
        <div className="flex items-center gap-2">
          {etapasVisiveis.map((etapa, idx) => {
            const etapaData = card.etapas.find((e) => e.etapa === etapa);
            const concluida = etapaData?.status === "CONCLUIDA";
            const atual = etapa === card.etapaAtual;
            const futura = idx > etapaAtualIdx;

            return (
              <div key={etapa} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center flex-1 cursor-pointer group`}
                  onClick={() => {
                    if (atual && !concluida) avancarEtapa(etapa);
                    else if (concluida && etapaData) setReadOnlyEtapa(etapaData);
                  }}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      concluida
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : atual
                        ? "bg-primary border-primary text-primary-foreground"
                        : futura
                        ? "border-muted-foreground/30 text-muted-foreground/30"
                        : "border-muted-foreground/30 text-muted-foreground/30"
                    }`}
                  >
                    {concluida ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 text-center leading-tight ${
                      atual
                        ? "text-primary font-medium"
                        : concluida
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {LABEL_ETAPA[etapa].split(" ")[0]}
                  </span>
                </div>
                {idx < etapasVisiveis.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded transition-colors ${
                      idx < etapaAtualIdx ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: etapas + comentários */}
        <div className="col-span-2 space-y-6">
          <Tabs defaultValue="etapa">
            <TabsList>
              <TabsTrigger value="etapa">Etapa Atual</TabsTrigger>
              <TabsTrigger value="comentarios">
                Comentários {comentarios.length > 0 && `(${comentarios.length})`}
              </TabsTrigger>
              <TabsTrigger value="qualidade">
                Qualidade {card.qualidade.length > 0 && `(${card.qualidade.length})`}
              </TabsTrigger>
              <TabsTrigger value="observacoes">Observações</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Etapa atual */}
            <TabsContent value="etapa" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {LABEL_ETAPA[card.etapaAtual]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ChecklistPanel
                    cardId={card.id}
                    etapa={card.etapaAtual}
                    cardEtapas={card.etapas}
                    checklists={checklists}
                  />

                  {ETAPAS_COM_DOCS.has(card.etapaAtual) && card.empresa.configDocumentos.some((d) => d.ativo) && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Documentos Fiscais
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {card.empresa.configDocumentos.filter((d) => d.ativo).map((doc) => {
                          const marcado = (docsEtapa[card.etapaAtual] ?? []).includes(doc.tipoDocumento);
                          return (
                            <label
                              key={doc.tipoDocumento}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors ${
                                marcado
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={marcado}
                                onChange={() => toggleDocumento(card.etapaAtual as EtapaCard, doc.tipoDocumento, marcado)}
                                className="h-4 w-4 rounded border-input accent-emerald-600"
                              />
                              <span className="text-sm font-medium">
                                {LABEL_TIPO_DOC[doc.tipoDocumento] ?? doc.tipoDocumento}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {card.empresa.configBuscas.length > 0 && card.etapaAtual === "BUSCA_DOCUMENTOS" && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Portais de Busca
                      </p>
                      {card.empresa.configBuscas.map((b) => (
                        <div key={b.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{b.nome}</p>
                            <p className="text-xs text-muted-foreground">Login: {b.login}</p>
                          </div>
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Abrir portal →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {card.etapaAtual === "ENVIO_ACESSORIAS" && (
                    <div className="border rounded-lg p-3 space-y-2 bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900">
                      <p className="text-sm font-medium">Envio via Acessorias</p>
                      <p className="text-xs text-muted-foreground">
                        Acesse o portal Acessorias e realize o upload das obrigações desta competência.
                        Após o envio, marque a etapa como concluída.
                      </p>
                      <a
                        href="https://www.acessorias.com/login.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-primary hover:underline"
                      >
                        Abrir Acessorias →
                      </a>
                    </div>
                  )}

                  {card.etapaAtual === "CONFERENCIA" ? (
                    <div className="space-y-3">
                      <ErrosChecklist cardId={card.id} />
                      <ConferenciaActions
                      cardId={card.id}
                      etapa={card.etapaAtual}
                      data={(() => {
                        const e = card.etapas.find((x) => x.etapa === card.etapaAtual);
                        return e ? {
                          etapa: e.etapa,
                          status: e.status,
                          resultadoConferencia: e.resultadoConferencia,
                          comentarioRessalva: e.comentarioRessalva,
                          ressalvaResolvida: e.ressalvaResolvida,
                        } : undefined;
                      })()}
                    />
                    </div>
                  ) : (
                    <Button
                      onClick={() => avancarEtapa(card.etapaAtual)}
                      className="w-full"
                      disabled={card.etapaAtual === "CONCLUIDO"}
                    >
                      {card.etapaAtual === "CONCLUIDO"
                        ? "Card Concluído ✓"
                        : `Concluir: ${LABEL_ETAPA[card.etapaAtual]}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Comentários */}
            <TabsContent value="comentarios" className="space-y-4">
              <div className="space-y-4">
                {comentarios.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <UserAvatar nome={c.autor.nome} avatar={c.autor.avatar} size="sm" />
                    <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.autor.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{c.texto}</p>
                      {c.arquivos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.arquivos.map((a) => <AnexoChip key={a.id} arquivo={a} />)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <UserAvatar
                    nome={usuarioAtual.nome}
                    avatar={usuarioAtual.avatar}
                    size="sm"
                  />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      placeholder="Escreva um comentário... Use @nome para mencionar"
                      rows={3}
                    />
                    {novosArquivos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {novosArquivos.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-muted">
                            {f.name}
                            <button
                              onClick={() => setNovosArquivos((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-muted-foreground hover:text-foreground"
                              type="button"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={enviarComentario}
                        disabled={submitting || (!novoComentario.trim() && novosArquivos.length === 0)}
                      >
                        Comentar
                      </Button>
                      <label className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border cursor-pointer hover:bg-muted">
                        <Paperclip className="h-3.5 w-3.5" />
                        Anexar
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            setNovosArquivos((prev) => [...prev, ...files]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Qualidade */}
            <TabsContent value="qualidade" className="space-y-4">
              {card.qualidade.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum erro registrado
                </p>
              ) : (
                <div className="space-y-3">
                  {card.qualidade.map((erro) => (
                    <div key={erro.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive" className="text-xs">
                          {erro.tipoErro.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {LABEL_ETAPA[erro.etapa]}
                        </span>
                      </div>
                      <p className="text-sm">{erro.descricao}</p>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          nome={erro.responsavel.nome}
                          avatar={erro.responsavel.avatar}
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          {erro.responsavel.nome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Observações */}
            <TabsContent value="observacoes" className="space-y-4">
              {card.observacoesCard.map((obs) => (
                <div key={obs.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <UserAvatar nome={obs.autor.nome} avatar={obs.autor.avatar} size="sm" />
                    <span className="text-sm font-medium">{obs.autor.nome}</span>
                    {obs.persistente && (
                      <Badge variant="info" className="text-xs">
                        Vai para próxima competência
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">{obs.texto}</p>
                </div>
              ))}

              <div className="space-y-2">
                <Textarea
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Observação para próxima competência..."
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={salvarObservacao}
                  disabled={!novaObservacao.trim()}
                >
                  Salvar Observação
                </Button>
              </div>
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="historico" className="space-y-4">
              <HistoricoTab cardId={card.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: info sidebar */}
        <div className="space-y-4">
          {/* Responsável */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Responsável
                </p>
                {card.responsavel ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      nome={card.responsavel.nome}
                      avatar={card.responsavel.avatar}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-medium">{card.responsavel.nome}</p>
                      <p className="text-xs text-muted-foreground">{card.responsavel.perfil}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não atribuído</p>
                )}
              </div>

              {card.prazo && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Prazo
                  </p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(card.prazo).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empresa info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Empresa
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium">{card.empresa.razaoSocial}</p>
                {card.empresa.regimeTributario && (
                  <Badge variant="secondary">{card.empresa.regimeTributario.nome}</Badge>
                )}
              </div>
              <Link
                href={`/empresas/${card.empresa.id}`}
                className="text-xs text-primary hover:underline"
              >
                Ver empresa →
              </Link>
            </CardContent>
          </Card>

          {/* Documentos fiscais */}
          {card.empresa.configDocumentos.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Documentos
                </p>
                {card.empresa.configDocumentos
                  .filter((d) => d.ativo)
                  .map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between">
                      <span className="text-sm">{doc.tipoDocumento.replace("_", " ")}</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.origem}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EtapaReadOnlyModal
        etapa={readOnlyEtapa}
        open={!!readOnlyEtapa}
        onOpenChange={(v) => !v && setReadOnlyEtapa(null)}
      />

      {/* Dialog confirmação de protocolo */}
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
                await _chamarAvancarEtapa("IMPRESSAO_PROTOCOLO");
              }}
            >
              Sim, protocolo realizado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnexoChip({ arquivo }: { arquivo: ArquivoAnexo }) {
  const isImage = arquivo.tipo.startsWith("image/");
  async function abrir() {
    const res = await fetch(`/api/arquivos/${arquivo.id}`);
    if (!res.ok) {
      toast.error("Erro ao baixar arquivo");
      return;
    }
    const { data } = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }
  return (
    <button
      onClick={abrir}
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border bg-background hover:bg-muted max-w-xs"
      title={arquivo.nomeOriginal}
    >
      {isImage ? <FileImage className="h-3.5 w-3.5 text-blue-500" /> : <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className="truncate">{arquivo.nomeOriginal}</span>
      <Download className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}
