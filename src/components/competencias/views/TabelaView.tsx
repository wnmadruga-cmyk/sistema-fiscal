"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { LABEL_ETAPA } from "@/lib/competencia-utils";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, XCircle, Eye } from "lucide-react";
import type { CardItem, Etiqueta } from "../CompetenciasPageContent";
import type { ColumnKey } from "../ColumnConfigPopover";
import { EtapaCard } from "@prisma/client";
import { EtiquetasInline } from "../EtiquetasInline";
import { InlineEtapas } from "../InlineEtapas";
import { QuickNote } from "../QuickNote";
import { SmToggle } from "../SmToggle";
import { EmpresaInfoModal } from "../EmpresaInfoModal";

const ETAPA_COLOR: Record<EtapaCard, string> = {
  BUSCA_DOCUMENTOS: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CONFERENCIA_APURACAO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CONFERENCIA: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  TRANSMISSAO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ENVIO: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ENVIO_ACESSORIAS: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  IMPRESSAO_PROTOCOLO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CONCLUIDO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

interface TabelaViewProps {
  cards: CardItem[];
  columns: Set<ColumnKey>;
  etiquetas: Etiqueta[];
}

function isInlineBlocked(c: CardItem) {
  return c.empresa.exigirAbrirCard || c.empresa.grupos.some((g) => g.grupo.exigirAbrirCard);
}

export function TabelaView({ cards, columns, etiquetas }: TabelaViewProps) {
  const [infoCard, setInfoCard] = useState<CardItem | null>(null);

  const has = (k: ColumnKey) => columns.has(k);

  return (
    <>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b">
          <tr>
            <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-8"></th>
            {has("empresa") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Empresa</th>}
            {has("etiquetas") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Etiquetas</th>}
            {has("regime") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Regime</th>}
            {has("tipoAtividade") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Atividade</th>}
            {has("prioridade") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Prioridade</th>}
            {has("filial") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Escritório</th>}
            {has("grupos") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Grupos</th>}
            {has("respElaboracao") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Elab.</th>}
            {has("respConferencia") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Conf.</th>}
            {has("configEntrega") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Entrega</th>}
            {has("etapa") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Etapa</th>}
            {has("etapasInline") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Etapas</th>}
            {has("progresso") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Progresso</th>}
            {has("prazo") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Prazo</th>}
            {has("responsavel") && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Resp.</th>}
            {has("acoes") && <th className="px-3 py-2.5"></th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {cards.length === 0 ? (
            <tr>
              <td colSpan={20} className="text-center py-12 text-muted-foreground">
                Nenhum card encontrado
              </td>
            </tr>
          ) : (
            cards.map((card) => {
              const blocked = isInlineBlocked(card);
              const concluidasCount = card.etapas.filter((e) => e.status === "CONCLUIDA").length;
              const totalEtapas = card.etapas.length;
              const pct = totalEtapas > 0 ? Math.round((concluidasCount / totalEtapas) * 100) : 0;

              return (
                <tr
                  key={card.id}
                  className={`hover:bg-muted/30 transition-colors ${card.urgente ? "bg-red-50/30 dark:bg-red-950/10" : ""} ${card.semMovimento ? "opacity-60" : ""}`}
                >
                  <td className="px-3 py-2">
                    {card.urgente && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </td>

                  {has("empresa") && (
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => setInfoCard(card)}
                          className="text-muted-foreground hover:text-foreground mt-0.5"
                          title="Ver empresa"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {card.empresa.codigoInterno && (
                              <span className="text-xs text-muted-foreground font-mono">{card.empresa.codigoInterno}</span>
                            )}
                            <span className="font-medium">{card.empresa.razaoSocial}</span>
                            {card.semMovimentoMesAnterior && (
                              <Badge variant="warning" className="text-xs">SM mês ant.</Badge>
                            )}
                            {blocked && (
                              <Badge variant="secondary" className="text-[9px]" title="Exige abrir card para alterações">🔒</Badge>
                            )}
                            {card.etapas.some((e) => e.resultadoConferencia === "RESSALVA" && !e.ressalvaResolvida) && (
                              <Badge variant="warning" className="text-xs" title="Ressalva pendente">Ressalva</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {has("etiquetas") && (
                    <td className="px-3 py-2">
                      <EtiquetasInline cardId={card.id} current={card.etiquetas} todas={etiquetas} disabled={blocked} />
                    </td>
                  )}

                  {has("regime") && (
                    <td className="px-3 py-2">
                      {card.empresa.regimeTributario && (
                        <Badge variant="secondary" className="text-xs">{card.empresa.regimeTributario.codigo}</Badge>
                      )}
                    </td>
                  )}

                  {has("tipoAtividade") && (
                    <td className="px-3 py-2 text-xs">{card.empresa.tipoAtividade?.nome ?? "—"}</td>
                  )}

                  {has("prioridade") && (
                    <td className="px-3 py-2 text-xs">
                      {card.empresa.prioridade ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: card.empresa.prioridade.cor }} />
                          {card.empresa.prioridade.nome}
                        </span>
                      ) : "—"}
                    </td>
                  )}

                  {has("filial") && (
                    <td className="px-3 py-2 text-xs">{card.empresa.filial?.nome ?? "—"}</td>
                  )}

                  {has("grupos") && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {card.empresa.grupos.map((g) => (
                          <span key={g.grupo.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{g.grupo.nome}</span>
                        ))}
                      </div>
                    </td>
                  )}

                  {has("respElaboracao") && (
                    <td className="px-3 py-2 text-xs">{card.empresa.respElaboracao?.nome.split(" ")[0] ?? "—"}</td>
                  )}

                  {has("respConferencia") && (
                    <td className="px-3 py-2 text-xs">{card.empresa.respConferencia?.nome.split(" ")[0] ?? "—"}</td>
                  )}

                  {has("configEntrega") && (
                    <td className="px-3 py-2 text-[10px]">
                      <div className="flex flex-wrap gap-1">
                        {card.empresa.entregaImpressa && <span className="px-1.5 py-0.5 rounded bg-muted">Impr.</span>}
                        {card.empresa.entregaDigisac && <span className="px-1.5 py-0.5 rounded bg-muted">Digisac</span>}
                        {card.empresa.escritorioEntrega && <span className="px-1.5 py-0.5 rounded bg-muted">Escr.</span>}
                        {card.empresa.clienteBusca && <span className="px-1.5 py-0.5 rounded bg-muted">Cliente</span>}
                      </div>
                    </td>
                  )}

                  {has("etapa") && (
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ETAPA_COLOR[card.etapaAtual]}`}>
                        {LABEL_ETAPA[card.etapaAtual]}
                      </span>
                    </td>
                  )}

                  {has("etapasInline") && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <InlineEtapas card={card} disabled={blocked || card.semMovimento} />
                        <SmToggle cardId={card.id} semMovimento={card.semMovimento} disabled={blocked} />
                      </div>
                    </td>
                  )}

                  {has("progresso") && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{concluidasCount}/{totalEtapas}</span>
                      </div>
                    </td>
                  )}

                  {has("prazo") && (
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {card.prazo ? formatDate(card.prazo) : "—"}
                    </td>
                  )}

                  {has("responsavel") && (
                    <td className="px-3 py-2">
                      {card.responsavel && (
                        <div className="flex items-center gap-2">
                          <UserAvatar nome={card.responsavel.nome} avatar={card.responsavel.avatar} size="sm" />
                          <span className="text-xs">{card.responsavel.nome.split(" ")[0]}</span>
                        </div>
                      )}
                    </td>
                  )}

                  {has("acoes") && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <QuickNote cardId={card.id} count={card._count?.comentarios ?? 0} disabled={blocked} />
                        {(card._count?.qualidade ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-red-500">
                            <XCircle className="h-3 w-3" />
                            {card._count?.qualidade}
                          </span>
                        )}
                        <Link href={`/competencias/${card.id}`} className="text-xs text-primary hover:underline">
                          Abrir
                        </Link>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <EmpresaInfoModal card={infoCard} open={!!infoCard} onOpenChange={(v) => !v && setInfoCard(null)} />
    </>
  );
}
