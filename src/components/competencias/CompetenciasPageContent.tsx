"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutList,
  Columns,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import { rowsToCsv } from "@/lib/csv";
import { LABEL_ETAPA } from "@/lib/competencia-utils";
import { TabelaView } from "./views/TabelaView";
import { KanbanView } from "./views/KanbanView";
import { GerenciarDropdown } from "./GerenciarDropdown";
import { ColumnConfigPopover, type ColumnKey, DEFAULT_COLUMNS } from "./ColumnConfigPopover";
import { competenciaLabel, proxCompetencia, competenciaAnterior } from "@/lib/competencia-utils";
import type { EtapaCard, StatusCard, SituacaoFolha } from "@prisma/client";

export type CardItem = {
  id: string;
  competencia: string;
  status: StatusCard;
  etapaAtual: EtapaCard;
  urgente: boolean;
  semMovimento: boolean;
  semMovimentoMesAnterior: boolean;
  conferenciaForcada: boolean;
  notaQualidade: number | null;
  prazo: Date | null;
  empresa: {
    id: string;
    razaoSocial: string;
    codigoInterno: string | null;
    exigirAbrirCard: boolean;
    exigirConferencia: boolean;
    situacaoFolha: SituacaoFolha;
    fatorR: boolean;
    fechaAutomatico: boolean;
    clienteBusca: boolean;
    escritorioEntrega: boolean;
    entregaImpressa: boolean;
    entregaDigisac: boolean;
    semMovimentoTemp: boolean;
    diaVencimentoHonorarios: number | null;
    regimeTributario: { id: string; codigo: string; nome: string } | null;
    tipoAtividade: { id: string; nome: string } | null;
    prioridade: { id: string; nome: string; cor: string } | null;
    filial: { id: string; nome: string } | null;
    grupos: Array<{ grupo: { id: string; nome: string; cor: string | null; exigirAbrirCard: boolean; exigirConferencia: boolean } }>;
    respElaboracao: { id: string; nome: string; avatar: string | null } | null;
    respConferencia: { id: string; nome: string; avatar: string | null } | null;
  };
  prioridade: { id: string; nome: string; cor: string } | null;
  responsavel: { id: string; nome: string; avatar: string | null } | null;
  etapas: Array<{
    etapa: EtapaCard;
    status: string;
    resultadoConferencia: "APROVADO" | "REPROVADO" | "RESSALVA" | null;
    ressalvaResolvida: boolean;
  }>;
  etiquetas: Array<{ etiqueta: { id: string; nome: string; cor: string } }>;
  _count?: { comentarios: number; qualidade: number };
};

export type Etiqueta = { id: string; nome: string; cor: string };

interface CompetenciasPageContentProps {
  cards: CardItem[];
  grupos: { id: string; nome: string; cor: string | null }[];
  usuarios: { id: string; nome: string; avatar: string | null }[];
  competenciaAtual: string;
  usuarioId: string;
  usuarioPerfil: string;
  prioridades: { id: string; nome: string; cor: string; diasPrazo: number }[];
  empresas: { id: string; nome: string; prioridadeId: string | null }[];
  etiquetas: Etiqueta[];
  regimes: { id: string; codigo: string; nome: string }[];
  tiposAtividade: { id: string; nome: string }[];
  filiais: { id: string; nome: string }[];
  etapasConfig: { etapa: string; diasPrazo: number | null }[];
}

type AdvFilters = {
  grupoId: string;
  etiquetaId: string;
  situacaoFolha: SituacaoFolha | "";
  fatorR: "" | "sim" | "nao";
  fechaAutomatico: "" | "sim" | "nao";
  clienteBusca: "" | "sim" | "nao";
  escritorioEntrega: "" | "sim" | "nao";
  entregaImpressa: "" | "sim" | "nao";
  entregaDigisac: "" | "sim" | "nao";
  semMovimentoTemp: "" | "sim" | "nao";
  diaVencimentoHonorarios: string;
};

const advEmpty: AdvFilters = {
  grupoId: "",
  etiquetaId: "",
  situacaoFolha: "",
  fatorR: "",
  fechaAutomatico: "",
  clienteBusca: "",
  escritorioEntrega: "",
  entregaImpressa: "",
  entregaDigisac: "",
  semMovimentoTemp: "",
  diaVencimentoHonorarios: "",
};

function boolMatch(v: boolean, f: "" | "sim" | "nao") {
  if (!f) return true;
  return f === "sim" ? v : !v;
}

export function CompetenciasPageContent({
  cards,
  grupos,
  usuarios,
  competenciaAtual: competencia,
  usuarioId,
  usuarioPerfil,
  prioridades,
  empresas,
  etiquetas,
  regimes,
  tiposAtividade,
  filiais,
  etapasConfig,
}: CompetenciasPageContentProps) {
  const isPrivileged = usuarioPerfil === "ADMIN" || usuarioPerfil === "GERENTE";
  const router = useRouter();
  const [view, setView] = useState<"tabela" | "kanban">("tabela");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaCard | "">("");
  const [filtroUrgente, setFiltroUrgente] = useState(false);
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroRegime, setFiltroRegime] = useState("");
  const [filtroTipoAtv, setFiltroTipoAtv] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroFilial, setFiltroFilial] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState<AdvFilters>(advEmpty);
  const [columns, setColumns] = useState<Set<ColumnKey>>(() => new Set(DEFAULT_COLUMNS));

  const cardsFiltrados = useMemo(() => {
    setCurrentPage(1);
    return cards.filter((c) => {
      if (search) {
        const s = search.toLowerCase();
        const nome = c.empresa.razaoSocial.toLowerCase();
        const cod = (c.empresa.codigoInterno ?? "").toLowerCase();
        if (!nome.includes(s) && !cod.includes(s)) return false;
      }
      if (filtroEtapa && c.etapaAtual !== filtroEtapa) return false;
      if (filtroUrgente && !c.urgente) return false;
      if (filtroResponsavel && c.responsavel?.id !== filtroResponsavel) return false;
      if (filtroRegime && c.empresa.regimeTributario?.id !== filtroRegime) return false;
      if (filtroTipoAtv && c.empresa.tipoAtividade?.id !== filtroTipoAtv) return false;
      if (filtroPrioridade && c.empresa.prioridade?.id !== filtroPrioridade) return false;
      if (filtroFilial && c.empresa.filial?.id !== filtroFilial) return false;

      if (adv.grupoId && !c.empresa.grupos.some((g) => g.grupo.id === adv.grupoId)) return false;
      if (adv.etiquetaId && !c.etiquetas.some((e) => e.etiqueta.id === adv.etiquetaId)) return false;
      if (adv.situacaoFolha && c.empresa.situacaoFolha !== adv.situacaoFolha) return false;
      if (!boolMatch(c.empresa.fatorR, adv.fatorR)) return false;
      if (!boolMatch(c.empresa.fechaAutomatico, adv.fechaAutomatico)) return false;
      if (!boolMatch(c.empresa.clienteBusca, adv.clienteBusca)) return false;
      if (!boolMatch(c.empresa.escritorioEntrega, adv.escritorioEntrega)) return false;
      if (!boolMatch(c.empresa.entregaImpressa, adv.entregaImpressa)) return false;
      if (!boolMatch(c.empresa.entregaDigisac, adv.entregaDigisac)) return false;
      if (!boolMatch(c.empresa.semMovimentoTemp, adv.semMovimentoTemp)) return false;
      if (adv.diaVencimentoHonorarios) {
        const n = parseInt(adv.diaVencimentoHonorarios);
        if (!isNaN(n) && c.empresa.diaVencimentoHonorarios !== n) return false;
      }
      return true;
    });
  }, [cards, search, filtroEtapa, filtroUrgente, filtroResponsavel, filtroRegime, filtroTipoAtv, filtroPrioridade, filtroFilial, adv]);

  function exportarCsv() {
    const cols: { key: ColumnKey; label: string; get: (c: CardItem) => string }[] = [
      { key: "empresa", label: "Empresa", get: (c) => `${c.empresa.codigoInterno ? c.empresa.codigoInterno + " - " : ""}${c.empresa.razaoSocial}` },
      { key: "etiquetas", label: "Etiquetas", get: (c) => c.etiquetas.map((e) => e.etiqueta.nome).join("; ") },
      { key: "regime", label: "Regime", get: (c) => c.empresa.regimeTributario?.codigo ?? "" },
      { key: "tipoAtividade", label: "Tipo Atividade", get: (c) => c.empresa.tipoAtividade?.nome ?? "" },
      { key: "prioridade", label: "Prioridade", get: (c) => c.empresa.prioridade?.nome ?? "" },
      { key: "filial", label: "Escritório", get: (c) => c.empresa.filial?.nome ?? "" },
      { key: "grupos", label: "Grupos", get: (c) => c.empresa.grupos.map((g) => g.grupo.nome).join("; ") },
      { key: "respElaboracao", label: "Resp. Elaboração", get: (c) => c.empresa.respElaboracao?.nome ?? "" },
      { key: "respConferencia", label: "Resp. Conferência", get: (c) => c.empresa.respConferencia?.nome ?? "" },
      { key: "configEntrega", label: "Config. Entrega", get: (c) => [
          c.empresa.entregaImpressa && "Impressa",
          c.empresa.entregaDigisac && "Digisac",
          c.empresa.escritorioEntrega && "Escritório",
        ].filter(Boolean).join("; ") },
      { key: "etapa", label: "Etapa atual", get: (c) => LABEL_ETAPA[c.etapaAtual] },
      { key: "etapasInline", label: "Etapas", get: (c) => c.etapas.map((e) => `${LABEL_ETAPA[e.etapa]}:${e.status}`).join("; ") },
      { key: "progresso", label: "Progresso", get: (c) => {
          const total = c.etapas.length;
          const done = c.etapas.filter((e) => e.status === "CONCLUIDA").length;
          return total ? `${done}/${total}` : "";
        } },
      { key: "prazo", label: "Prazo", get: (c) => c.prazo ? new Date(c.prazo).toLocaleDateString("pt-BR") : "" },
      { key: "responsavel", label: "Responsável", get: (c) => c.responsavel?.nome ?? "" },
      // Campos avançados
      { key: "situacaoFolha", label: "Folha", get: (c) => ({ NAO_TEM: "Não tem", RH: "RH", FISCAL: "Fiscal" }[c.empresa.situacaoFolha] ?? c.empresa.situacaoFolha) },
      { key: "diaVencimentoHonorarios", label: "Dia Venc. Honorários", get: (c) => c.empresa.diaVencimentoHonorarios?.toString() ?? "" },
      { key: "fatorR", label: "Fator R", get: (c) => c.empresa.fatorR ? "Sim" : "Não" },
      { key: "fechaAutomatico", label: "Fecha Automático", get: (c) => c.empresa.fechaAutomatico ? "Sim" : "Não" },
      { key: "clienteBusca", label: "Cliente Busca", get: (c) => c.empresa.clienteBusca ? "Sim" : "Não" },
      { key: "escritorioEntrega", label: "Escritório Entrega", get: (c) => c.empresa.escritorioEntrega ? "Sim" : "Não" },
      { key: "entregaImpressa", label: "Entrega Impressa", get: (c) => c.empresa.entregaImpressa ? "Sim" : "Não" },
      { key: "entregaDigisac", label: "Entrega Digisac", get: (c) => c.empresa.entregaDigisac ? "Sim" : "Não" },
      { key: "semMovimentoTemp", label: "Sem Movimento Temp.", get: (c) => c.empresa.semMovimentoTemp ? "Sim" : "Não" },
    ];
    const visible = cols.filter((c) => columns.has(c.key));
    if (!visible.length) return;
    const headers = ["Competência", "Status", ...visible.map((c) => c.label)];
    const data = cardsFiltrados.map((c) => [
      competenciaLabel(c.competencia),
      c.status,
      ...visible.map((col) => col.get(c)),
    ]);
    const csv = rowsToCsv(headers, data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competencias-${competencia}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function navCompetencia(dir: "prev" | "next") {
    const nova = dir === "prev" ? competenciaAnterior(competencia) : proxCompetencia(competencia);
    router.push(`/competencias?competencia=${nova}`);
    // router.push já muda a URL → React Query detecta nova queryKey → refetch automático
  }

  const urgentesCount = cards.filter((c) => c.urgente).length;
  const concluidosCount = cards.filter((c) => c.status === "CONCLUIDO").length;
  const advCount = Object.values(adv).filter((v) => v !== "").length;

  const totalPages = Math.ceil(cardsFiltrados.length / perPage);
  const cardsPaginados = cardsFiltrados.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Fluxo Fiscal</h1>
          <div className="flex items-center gap-1 rounded-lg border px-1 py-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navCompetencia("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
              {competenciaLabel(competencia)}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navCompetencia("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {urgentesCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {urgentesCount} urgente{urgentesCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Badge variant="secondary">
            {concluidosCount}/{cards.length} concluídos
          </Badge>
          {isPrivileged && (
            <GerenciarDropdown
              competencia={competencia}
              prioridades={prioridades}
              empresas={empresas}
              etapasConfig={etapasConfig}
              total={cards.length}
            />
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={exportarCsv} title="Exportar CSV (filtros e colunas atuais)">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          <ColumnConfigPopover columns={columns} onChange={setColumns} />
          <Tabs value={view} onValueChange={(v) => setView(v as "tabela" | "kanban")}>
            <TabsList className="h-8">
              <TabsTrigger value="tabela" className="px-2 h-7">
                <LayoutList className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="kanban" className="px-2 h-7">
                <Columns className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-6 py-3 border-b bg-background/80">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 w-52 text-sm"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Responsável: todos</option>
            <option value={usuarioId}>Meus cards</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>

          <select
            value={filtroRegime}
            onChange={(e) => setFiltroRegime(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Regime: todos</option>
            {regimes.map((r) => <option key={r.id} value={r.id}>{r.codigo}</option>)}
          </select>

          <select
            value={filtroTipoAtv}
            onChange={(e) => setFiltroTipoAtv(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Atividade: todas</option>
            {tiposAtividade.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>

          <select
            value={filtroFilial}
            onChange={(e) => setFiltroFilial(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Escritório: todos</option>
            {filiais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>

          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Prioridade: todas</option>
            {prioridades.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>

          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value as EtapaCard | "")}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Etapa: todas</option>
            <option value="BUSCA_DOCUMENTOS">Busca</option>
            <option value="CONFERENCIA_APURACAO">Conferência/Apuração</option>
            <option value="CONFERENCIA">Conferência</option>
            <option value="TRANSMISSAO">Transmissão</option>
            <option value="ENVIO">Envio</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>

          <button
            onClick={() => setFiltroUrgente(!filtroUrgente)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm transition-colors ${
              filtroUrgente
                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                : "border-input hover:bg-muted"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Urgentes
          </button>

          <button
            onClick={() => setAdvOpen((v) => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm transition-colors ${
              advOpen || advCount > 0 ? "bg-muted border-muted-foreground/20" : "border-input hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Avançado{advCount > 0 ? ` (${advCount})` : ""}
          </button>

          <span className="ml-auto text-xs text-muted-foreground">
            {cardsFiltrados.length} cards
          </span>
        </div>

        {advOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t">
            <select value={adv.grupoId} onChange={(e) => setAdv({ ...adv, grupoId: e.target.value })} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
              <option value="">Grupo: qualquer</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
            <select value={adv.etiquetaId} onChange={(e) => setAdv({ ...adv, etiquetaId: e.target.value })} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
              <option value="">Etiqueta: qualquer</option>
              {etiquetas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select value={adv.situacaoFolha} onChange={(e) => setAdv({ ...adv, situacaoFolha: e.target.value as SituacaoFolha | "" })} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
              <option value="">Folha: qualquer</option>
              <option value="NAO_TEM">Não tem</option>
              <option value="RH">RH</option>
              <option value="FISCAL">Fiscal</option>
            </select>
            {(["fatorR","fechaAutomatico","clienteBusca","escritorioEntrega","entregaImpressa","entregaDigisac","semMovimentoTemp"] as const).map((k) => (
              <select key={k} value={adv[k]} onChange={(e) => setAdv({ ...adv, [k]: e.target.value as "" | "sim" | "nao" })} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="">{k}: indif.</option>
                <option value="sim">{k}: sim</option>
                <option value="nao">{k}: não</option>
              </select>
            ))}
            <Input type="number" min={1} max={31} placeholder="Dia venc. honorários" value={adv.diaVencimentoHonorarios} onChange={(e) => setAdv({ ...adv, diaVencimentoHonorarios: e.target.value })} className="h-8 text-sm" />
            <Button variant="ghost" size="sm" onClick={() => setAdv(advEmpty)}>Limpar avançados</Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {view === "tabela" ? (
          <TabelaView cards={cardsPaginados} columns={columns} etiquetas={etiquetas} />
        ) : (
          <KanbanView cards={cardsFiltrados} />
        )}
      </div>

      {view === "tabela" && (
        <div className="flex items-center justify-between px-6 py-2 border-t bg-background text-sm">
          <p className="text-muted-foreground">
            {cardsFiltrados.length === 0
              ? "Nenhum card"
              : `Exibindo ${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, cardsFiltrados.length)} de ${cardsFiltrados.length} cards`}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Por página:</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage >= totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
