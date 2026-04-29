"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LABEL_ETAPA, competenciaLabel } from "@/lib/competencia-utils";
import type { EtapaCard } from "@prisma/client";

interface DashboardContentProps {
  usuarioNome: string;
  competencia: string;
  cardsPendentes: number;
  cardsUrgentes: number;
  prazoProximo: Array<{
    id: string;
    prazo: Date | null;
    empresa: { razaoSocial: string; nomeFantasia: string | null };
    prioridade: { nome: string; cor: string } | null;
  }>;
  notificacoes: Array<{
    id: string;
    titulo: string;
    mensagem: string;
    tipo: string;
    createdAt: Date;
    lida: boolean;
  }>;
  resumoEtapas: Array<{ etapa: EtapaCard; total: number }>;
}

export function DashboardContent({
  usuarioNome,
  competencia,
  cardsPendentes,
  cardsUrgentes,
  prazoProximo,
  notificacoes,
  resumoEtapas,
}: DashboardContentProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {usuarioNome.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Competência atual: {competenciaLabel(competencia)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tarefas Pendentes"
          value={cardsPendentes}
          icon={CheckSquare}
          href={`/competencias?responsavel=me`}
          color="blue"
        />
        <StatCard
          title="Urgentes"
          value={cardsUrgentes}
          icon={AlertTriangle}
          href={`/competencias?urgente=true`}
          color="red"
        />
        <StatCard
          title="Vencendo em 7 dias"
          value={prazoProximo.length}
          icon={Clock}
          href={`/competencias`}
          color="amber"
        />
        <StatCard
          title="Notificações"
          value={notificacoes.length}
          icon={Bell}
          href={`/dashboard`}
          color="purple"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo por etapa */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo por Etapa — {competenciaLabel(competencia)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resumoEtapas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum card em andamento
              </p>
            ) : (
              <div className="space-y-3">
                {resumoEtapas
                  .sort((a, b) => {
                    const ordem = [
                      "BUSCA_DOCUMENTOS",
                      "CONFERENCIA_APURACAO",
                      "CONFERENCIA",
                      "TRANSMISSAO",
                      "ENVIO",
                      "CONCLUIDO",
                    ];
                    return ordem.indexOf(a.etapa) - ordem.indexOf(b.etapa);
                  })
                  .map((item) => (
                    <div key={item.etapa} className="flex items-center justify-between">
                      <Link
                        href={`/competencias?etapa=${item.etapa}`}
                        className="text-sm hover:text-primary transition-colors"
                      >
                        {LABEL_ETAPA[item.etapa]}
                      </Link>
                      <Badge variant="secondary">{item.total}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prazos próximos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prazos Próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prazoProximo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum prazo nos próximos 7 dias
              </p>
            ) : (
              <div className="space-y-3">
                {prazoProximo.map((card) => (
                  <div key={card.id} className="space-y-0.5">
                    <p className="text-sm font-medium line-clamp-1">
                      {card.empresa.nomeFantasia ?? card.empresa.razaoSocial}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prazo: {card.prazo ? formatDate(card.prazo) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notificações recentes */}
      {notificacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notificacoes.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {n.mensagem}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
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

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  href: string;
  color: "blue" | "red" | "amber" | "purple";
}) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
    red: "text-red-600 bg-red-50 dark:bg-red-950/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/20",
  };

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${colors[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
