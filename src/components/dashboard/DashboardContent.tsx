"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LABEL_ETAPA, ORDEM_ETAPAS, competenciaLabel } from "@/lib/competencia-utils";
import type { EtapaCard } from "@prisma/client";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Star,
  XCircle,
  CheckSquare,
  Building2,
  ChevronRight,
  ChevronDown,
  LayoutList,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";

// ─── tipos ───────────────────────────────────────────────────────────────────

type CardResumo = {
  id: string;
  prazo: Date | null;
  urgente: boolean;
  etapaAtual: EtapaCard;
  empresa: { razaoSocial: string; nomeFantasia: string | null; codigoInterno: string | null };
  prioridade: { nome: string; cor: string } | null;
};

type ProdItem = {
  responsavel: { id: string; nome: string; avatar: string | null };
  total: number;
  concluidas: number;
  pendentes: number;
  media: number;
  ideal: number;
  status: "otimo" | "bom" | "regular" | "ruim";
  porEtapa: Array<{ etapa: string; count: number }>;
};

type FilialStat = { nome: string; total: number; concluidas: number; pendentes: number; pct: number };

type GestorData = {
  totalCards: number;
  concluidosCount: number;
  pendentesCount: number;
  atrasadosCount: number;
  urgentesCount: number;
  meusPendentes: number;
  resumoEtapas: Array<{ etapa: EtapaCard; total: number }>;
  prioridadesDistribuicao: Array<{ prioridade: { id: string; nome: string; cor: string }; total: number }>;
  prazosProximos: Array<CardResumo & { responsavel: { nome: string } | null }>;
  workload: Array<{ responsavel: { id: string; nome: string; avatar: string | null }; total: number; urgentes: number }>;
  qualidadeAberta: number;
  notaMedia: number | null;
  notaMediaCount: number;
  notificacoesCount: number;
  filiaisStats: FilialStat[];
  produtividade: ProdItem[];
  diasUteis: { total: number; elapsed: number; restantes: number };
};

type OperacionalData = {
  meusPendentes: number;
  meusUrgentes: number;
  meusPrazos: number;
  resumoEtapas: Array<{ etapa: EtapaCard; total: number }>;
  prazosProximos: CardResumo[];
  notificacoes: Array<{ id: string; titulo: string; mensagem: string; tipo: string; createdAt: Date; lida: boolean }>;
};

interface Props {
  usuarioNome: string;
  usuarioPerfil: string;
  competencia: string;
  gestorData: GestorData | null;
  operacionalData: OperacionalData | null;
}

// ─── cores das etapas ────────────────────────────────────────────────────────
const ETAPA_COR: Record<string, string> = {
  BUSCA_DOCUMENTOS: "#3b82f6",
  BAIXAR_NOTAS_ACESSO: "#6366f1",
  PEDIR_NOTAS_RECEITA_PR: "#8b5cf6",
  POSSIVEIS_SEM_MOVIMENTO: "#a78bfa",
  CONFERENCIA_APURACAO: "#f59e0b",
  CONFERENCIA: "#f97316",
  TRANSMISSAO: "#10b981",
  ENVIO: "#14b8a6",
  ENVIO_ACESSORIAS: "#06b6d4",
  IMPRESSAO_PROTOCOLO: "#84cc16",
  CONCLUIDO: "#22c55e",
};

// ─── componente principal ─────────────────────────────────────────────────────

export function DashboardContent({ usuarioNome, usuarioPerfil, competencia, gestorData, operacionalData }: Props) {
  const isPrivileged = usuarioPerfil === "ADMIN" || usuarioPerfil === "GERENTE";
  const primeiroNome = usuarioNome.split(" ")[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Olá, {primeiroNome}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Competência em foco:{" "}
            <Link href={`/competencias?competencia=${competencia}`} className="font-medium text-primary hover:underline">
              {competenciaLabel(competencia)}
            </Link>
            {isPrivileged && (
              <Badge variant="secondary" className="ml-2 text-xs">{usuarioPerfil}</Badge>
            )}
          </p>
        </div>
      </div>

      {isPrivileged && gestorData ? (
        <GestorView data={gestorData} competencia={competencia} />
      ) : operacionalData ? (
        <OperacionalView data={operacionalData} competencia={competencia} />
      ) : null}
    </div>
  );
}

// ─── Visão do Gestor ──────────────────────────────────────────────────────────

function GestorView({ data, competencia }: { data: GestorData; competencia: string }) {
  const [prazosOpen, setPrazosOpen] = useState(false);
  const [prodView, setProdView] = useState<"produtividade" | "etapas">("produtividade");
  const pct = data.totalCards > 0 ? Math.round((data.concluidosCount / data.totalCards) * 100) : 0;
  const emAndamento = data.totalCards - data.concluidosCount;

  // Ordena etapas pela ordem padrão e remove CONCLUIDO para o gráfico de pipeline
  const etapasOrdenadas = ORDEM_ETAPAS
    .map((etapa) => {
      const found = data.resumoEtapas.find((r) => r.etapa === etapa);
      return found ? { etapa, total: found.total, nome: LABEL_ETAPA[etapa] } : null;
    })
    .filter((e): e is { etapa: EtapaCard; total: number; nome: string } => e !== null && e.total > 0);

  return (
    <div className="space-y-6">
      {/* ── Linha 1: Métricas globais ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Empresas"
          value={data.totalCards}
          sub={`${data.concluidosCount} concluídas`}
          sub2={`${data.pendentesCount} pendentes`}
          icon={Building2}
          color="blue"
          href={`/competencias?competencia=${competencia}`}
        />
        <StatCard
          label="Concluídas"
          value={`${pct}%`}
          sub={`${data.concluidosCount} de ${data.totalCards}`}
          icon={CheckCircle2}
          color="green"
          href={`/competencias?competencia=${competencia}`}
        />
        <StatCard
          label="Urgentes em Aberto"
          value={data.urgentesCount}
          sub="requerem atenção"
          icon={AlertTriangle}
          color="red"
          href={`/competencias?competencia=${competencia}&urgente=true`}
        />
        <StatCard
          label="Atrasadas"
          value={data.atrasadosCount}
          sub="prazo vencido"
          icon={XCircle}
          color="amber"
          href={`/competencias?competencia=${competencia}`}
        />
      </div>

      {/* ── Filiais ── */}
      {data.filiaisStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Status por Escritório / Filial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.filiaisStats.map((f) => (
                <div key={f.nome} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{f.nome}</span>
                    <span className={`text-xs font-bold shrink-0 ${f.pct === 100 ? "text-emerald-600" : f.pct >= 80 ? "text-blue-600" : "text-amber-600"}`}>
                      {f.pct}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${f.pct === 100 ? "bg-emerald-500" : f.pct >= 80 ? "bg-blue-500" : "bg-amber-500"}`}
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{f.total} total</span>
                    <span className="text-emerald-600 font-medium">{f.concluidas} conc.</span>
                    <span className="text-amber-600">{f.pendentes} pend.</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Linha 2: Progresso + Minha fila ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progresso da competência */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Progresso da Competência — {competenciaLabel(competencia)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barra global */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{data.concluidosCount} concluídas</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{emAndamento} em andamento</span>
                <span>{data.totalCards} total</span>
              </div>
            </div>

            {/* Pipeline por etapa */}
            {etapasOrdenadas.length > 0 && (
              <div className="space-y-1.5">
                {etapasOrdenadas.map((item) => {
                  const pctEtapa = data.totalCards > 0 ? (item.total / data.totalCards) * 100 : 0;
                  return (
                    <Link
                      key={item.etapa}
                      href={`/competencias?competencia=${competencia}&etapa=${item.etapa}`}
                      className="flex items-center gap-2 group hover:opacity-80"
                    >
                      <span className="text-xs text-muted-foreground w-44 shrink-0 truncate group-hover:text-primary">
                        {item.nome}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pctEtapa}%`,
                            background: ETAPA_COR[item.etapa] ?? "#64748b",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right shrink-0">{item.total}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Minha área pessoal */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Minha Área</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Minha fila</span>
                </div>
                <Badge variant="secondary" className="text-sm font-bold">{data.meusPendentes}</Badge>
              </div>
              <button
                onClick={() => setPrazosOpen((v) => !v)}
                className="w-full flex items-center justify-between hover:bg-muted/50 rounded-md -mx-1 px-1 py-0.5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Prazos em 2 dias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-sm font-bold">{data.prazosProximos.length}</Badge>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${prazosOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {prazosOpen && data.prazosProximos.length > 0 && (
                <div className="mt-1 space-y-1 border-t pt-2">
                  {data.prazosProximos.map((card) => (
                    <Link
                      key={card.id}
                      href={`/competencias/${card.id}`}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted group"
                    >
                      {card.prioridade && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: card.prioridade.cor }} />
                      )}
                      <span className="text-xs flex-1 truncate group-hover:text-primary">
                        {card.empresa.codigoInterno && (
                          <span className="font-mono text-muted-foreground mr-1">{card.empresa.codigoInterno}</span>
                        )}
                        {card.empresa.nomeFantasia ?? card.empresa.razaoSocial}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {card.prazo ? formatDate(card.prazo) : "—"}
                      </span>
                      {card.urgente && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Notificações</span>
                </div>
                <Badge variant={data.notificacoesCount > 0 ? "destructive" : "secondary"} className="text-sm font-bold">
                  {data.notificacoesCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Qualidade */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qualidade</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Erros em aberto</span>
                </div>
                <Badge variant={data.qualidadeAberta > 0 ? "destructive" : "secondary"} className="text-sm font-bold">
                  {data.qualidadeAberta}
                </Badge>
              </div>
              {data.notaMedia !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Nota média</span>
                  </div>
                  <span className={`text-sm font-bold ${data.notaMedia >= 80 ? "text-emerald-600" : data.notaMedia >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {data.notaMedia}%
                  </span>
                </div>
              )}
              {data.notaMediaCount > 0 && (
                <p className="text-xs text-muted-foreground">{data.notaMediaCount} conferência{data.notaMediaCount !== 1 ? "s" : ""} avaliada{data.notaMediaCount !== 1 ? "s" : ""}</p>
              )}
              <Link href="/qualidade" className="text-xs text-primary hover:underline block">
                Ver controle de qualidade →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Linha 3: Distribuição por etapa (gráfico) + Prioridades ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Cards por Etapa (todos os status)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {etapasOrdenadas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum card em andamento</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, etapasOrdenadas.length * 32)}>
                <BarChart
                  layout="vertical"
                  data={etapasOrdenadas.map((e) => ({ ...e, fill: ETAPA_COR[e.etapa] ?? "#64748b" }))}
                  margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={160}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Cards"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por prioridade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.prioridadesDistribuicao.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <>
                {data.prioridadesDistribuicao
                  .sort((a, b) => b.total - a.total)
                  .map(({ prioridade, total }) => {
                    const pctP = data.totalCards > 0 ? (total / data.totalCards) * 100 : 0;
                    return (
                      <div key={prioridade.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: prioridade.cor }} />
                            <span className="text-sm">{prioridade.nome}</span>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pctP}%`, background: prioridade.cor }} />
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Linha 4: Produtividade + Prazos próximos ── */}
      <div className="grid grid-cols-1 gap-4">
        {/* Produtividade da Equipe */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Produtividade da Equipe
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Dias úteis: <span className="font-bold text-foreground ml-0.5">{data.diasUteis.total}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Restantes: <span className="font-bold text-foreground ml-0.5">{data.diasUteis.restantes}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-md border p-0.5">
                  <button
                    onClick={() => setProdView("produtividade")}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${prodView === "produtividade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Produtividade
                  </button>
                  <button
                    onClick={() => setProdView("etapas")}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${prodView === "etapas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutList className="h-3 w-3 inline mr-1" />
                    Por etapa
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.produtividade.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum responsável de elaboração atribuído</p>
            ) : prodView === "produtividade" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                      <th className="text-left pb-2 font-medium">Nome</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                      <th className="text-right pb-2 font-medium">Conc.</th>
                      <th className="text-right pb-2 font-medium">Pend.</th>
                      <th className="text-right pb-2 font-medium">Média/dia</th>
                      <th className="text-right pb-2 font-medium">Ideal/dia</th>
                      <th className="text-right pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.produtividade.map(({ responsavel, total, concluidas, pendentes, media, ideal, status }) => (
                      <tr key={responsavel.id} className="hover:bg-muted/20">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <UserAvatar nome={responsavel.nome} avatar={responsavel.avatar} size="sm" />
                            <span className="font-medium">{responsavel.nome.split(" ")[0]}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right font-medium">{total}</td>
                        <td className="py-2 text-right text-emerald-600 font-medium">{concluidas}</td>
                        <td className="py-2 text-right text-amber-600">{pendentes}</td>
                        <td className="py-2 text-right text-muted-foreground">{media}</td>
                        <td className="py-2 text-right text-muted-foreground">{ideal}</td>
                        <td className="py-2 text-right">
                          <span className={`font-semibold ${
                            status === "otimo" ? "text-emerald-600" :
                            status === "bom" ? "text-blue-600" :
                            status === "regular" ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {status === "otimo" ? "Ótimo" : status === "bom" ? "Bom" : status === "regular" ? "Regular" : "Ruim"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                      <th className="text-left pb-2 font-medium">Nome</th>
                      <th className="text-left pb-2 font-medium">Etapa</th>
                      <th className="text-right pb-2 font-medium">Cards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.produtividade.flatMap(({ responsavel, concluidas, porEtapa }) => {
                      const rows = [];
                      if (concluidas > 0) {
                        rows.push(
                          <tr key={`${responsavel.id}-CONCLUIDO`} className="hover:bg-muted/20">
                            <td className="py-1.5 pr-4">
                              <div className="flex items-center gap-2">
                                <UserAvatar nome={responsavel.nome} avatar={responsavel.avatar} size="sm" />
                                <span className="font-medium">{responsavel.nome.split(" ")[0]}</span>
                              </div>
                            </td>
                            <td className="py-1.5">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Concluído
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-medium text-emerald-600">{concluidas}</td>
                          </tr>
                        );
                      }
                      porEtapa
                        .sort((a, b) => b.count - a.count)
                        .forEach(({ etapa, count }) => {
                          rows.push(
                            <tr key={`${responsavel.id}-${etapa}`} className="hover:bg-muted/20">
                              <td className="py-1.5 pr-4 text-muted-foreground text-xs pl-7">—</td>
                              <td className="py-1.5 text-xs text-muted-foreground">
                                {LABEL_ETAPA[etapa as import("@prisma/client").EtapaCard] ?? etapa}
                              </td>
                              <td className="py-1.5 text-right">{count}</td>
                            </tr>
                          );
                        });
                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prazos próximos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Prazos nos Próximos 2 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.prazosProximos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo nos próximos 2 dias</p>
            ) : (
              <div className="space-y-2">
                {data.prazosProximos.map((card) => (
                  <Link
                    key={card.id}
                    href={`/competencias/${card.id}`}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted group"
                  >
                    {card.prioridade && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: card.prioridade.cor }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {card.empresa.codigoInterno && (
                          <span className="text-xs text-muted-foreground font-mono mr-1.5">{card.empresa.codigoInterno}</span>
                        )}
                        {card.empresa.nomeFantasia ?? card.empresa.razaoSocial}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{formatDate(card.prazo!)}</p>
                        {card.responsavel && (
                          <span className="text-xs text-muted-foreground">· {card.responsavel.nome.split(" ")[0]}</span>
                        )}
                      </div>
                    </div>
                    {card.urgente && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Visão Operacional ────────────────────────────────────────────────────────

function OperacionalView({ data, competencia }: { data: OperacionalData; competencia: string }) {
  const [prazosOpen, setPrazosOpen] = useState(false);
  const hoje = new Date();

  // Ordena etapas
  const etapasOrdenadas = ORDEM_ETAPAS
    .map((etapa) => {
      const found = data.resumoEtapas.find((r) => r.etapa === etapa);
      return found ? { etapa, total: found.total, nome: LABEL_ETAPA[etapa] } : null;
    })
    .filter((e): e is { etapa: EtapaCard; total: number; nome: string } => e !== null);

  return (
    <div className="space-y-6">
      {/* Linha 1: métricas pessoais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Minha Fila"
          value={data.meusPendentes}
          sub="cards pendentes"
          icon={CheckSquare}
          color="blue"
          href={`/competencias?competencia=${competencia}`}
        />
        <StatCard
          label="Urgentes"
          value={data.meusUrgentes}
          sub="na minha fila"
          icon={AlertTriangle}
          color="red"
          href={`/competencias?competencia=${competencia}&urgente=true`}
        />
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer h-full"
          onClick={() => data.meusPrazos > 0 && setPrazosOpen((v) => !v)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-tight">Vencem em 2 dias</p>
                <p className="text-3xl font-bold mt-1 leading-none">{data.meusPrazos}</p>
                <p className="text-xs text-muted-foreground mt-1">dos meus cards</p>
              </div>
              <div className="p-2.5 rounded-xl shrink-0 text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            {data.meusPrazos > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <span>{prazosOpen ? "Ocultar" : "Ver empresas"}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${prazosOpen ? "rotate-180" : ""}`} />
              </div>
            )}
          </CardContent>
        </Card>
        <StatCard
          label="Notificações"
          value={data.notificacoes.length}
          sub="não lidas"
          icon={Bell}
          color="purple"
          href="/dashboard"
        />
      </div>

      {/* Expandable prazos list */}
      {prazosOpen && data.prazosProximos.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Empresas com prazo nos próximos 2 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.prazosProximos.map((card) => {
                const prazoDate = card.prazo ? new Date(card.prazo) : null;
                const diasRestantes = prazoDate
                  ? Math.ceil((prazoDate.getTime() - hoje.getTime()) / 86400000)
                  : null;
                return (
                  <Link
                    key={card.id}
                    href={`/competencias/${card.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted group"
                  >
                    {card.prioridade && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: card.prioridade.cor }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {card.empresa.codigoInterno && (
                          <span className="text-xs text-muted-foreground font-mono mr-1.5">{card.empresa.codigoInterno}</span>
                        )}
                        {card.empresa.nomeFantasia ?? card.empresa.razaoSocial}
                      </p>
                      <p className="text-xs text-muted-foreground">{LABEL_ETAPA[card.etapaAtual]}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {prazoDate && (
                        <span className="text-xs text-muted-foreground">{formatDate(prazoDate)}</span>
                      )}
                      {diasRestantes !== null && (
                        <span className={`text-xs font-medium ${diasRestantes <= 1 ? "text-red-600" : "text-amber-600"}`}>
                          {diasRestantes <= 0 ? "hoje" : `${diasRestantes}d`}
                        </span>
                      )}
                      {card.urgente && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linha 2: minhas etapas + meus prazos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Minhas etapas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Meus Cards por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {etapasOrdenadas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum card pendente</p>
            ) : (
              <div className="space-y-2">
                {etapasOrdenadas.map((item) => (
                  <Link
                    key={item.etapa}
                    href={`/competencias?competencia=${competencia}&etapa=${item.etapa}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted group"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: ETAPA_COR[item.etapa] ?? "#64748b" }}
                    />
                    <span className="text-sm flex-1 group-hover:text-primary">{item.nome}</span>
                    <Badge variant="secondary" className="font-bold">{item.total}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meus prazos próximos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Meus Prazos (2 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.prazosProximos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum prazo nos próximos 2 dias</p>
            ) : (
              <div className="space-y-2">
                {data.prazosProximos.map((card) => {
                  const prazoDate = card.prazo ? new Date(card.prazo) : null;
                  const diasRestantes = prazoDate
                    ? Math.ceil((prazoDate.getTime() - hoje.getTime()) / 86400000)
                    : null;
                  return (
                    <Link
                      key={card.id}
                      href={`/competencias/${card.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted group"
                    >
                      {card.prioridade && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: card.prioridade.cor }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {card.empresa.codigoInterno && (
                            <span className="text-xs text-muted-foreground font-mono mr-1.5">{card.empresa.codigoInterno}</span>
                          )}
                          {card.empresa.nomeFantasia ?? card.empresa.razaoSocial}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {card.prazo ? formatDate(card.prazo) : "—"} · {LABEL_ETAPA[card.etapaAtual]}
                        </p>
                      </div>
                      {diasRestantes !== null && (
                        <span className={`text-xs font-medium shrink-0 ${diasRestantes <= 1 ? "text-red-600" : diasRestantes <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {diasRestantes <= 0 ? "hoje" : `${diasRestantes}d`}
                        </span>
                      )}
                      {card.urgente && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notificações */}
      {data.notificacoes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notificações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.notificacoes.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{n.mensagem}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDate(n.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  sub2,
  icon: Icon,
  href,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  sub2?: string;
  icon: React.ElementType;
  href: string;
  color: "blue" | "red" | "amber" | "purple" | "green";
}) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400",
    red: "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400",
  };

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              <p className="text-3xl font-bold mt-1 leading-none">{value}</p>
              {(sub || sub2) && (
                <div className="flex items-center gap-3 mt-1">
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                  {sub2 && <p className="text-xs text-muted-foreground">{sub2}</p>}
                </div>
              )}
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${colors[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
