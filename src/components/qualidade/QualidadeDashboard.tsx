"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { LABEL_ETAPA } from "@/lib/competencia-utils";
import Link from "next/link";
import type { EtapaCard, TipoErro } from "@prisma/client";

const TIPO_ERRO_LABEL: Record<TipoErro, string> = {
  DADO_INCORRETO: "Dado Incorreto",
  DADO_FALTANDO: "Dado Faltando",
  PRAZO_PERDIDO: "Prazo Perdido",
  RETRABALHO: "Retrabalho",
  COMUNICACAO: "Comunicação",
  SISTEMA: "Sistema",
  OUTRO: "Outro",
};

interface QualidadeDashboardProps {
  erros: Array<{
    id: string;
    tipoErro: TipoErro;
    etapa: EtapaCard;
    descricao: string | null;
    createdAt: Date;
    card: {
      id: string;
      empresa: { razaoSocial: string; nomeFantasia: string | null };
    };
    responsavel: { id: string; nome: string; avatar: string | null };
  }>;
  totalPorTipo: Array<{ tipo: TipoErro; total: number }>;
  totalPorEtapa: Array<{ etapa: EtapaCard; total: number }>;
}

export function QualidadeDashboard({
  erros,
  totalPorTipo,
  totalPorEtapa,
}: QualidadeDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Controle de Qualidade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {erros.length} erro{erros.length !== 1 ? "s" : ""} em aberto
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Erros por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalPorTipo
              .sort((a, b) => b.total - a.total)
              .map((item) => (
                <div key={item.tipo} className="flex items-center justify-between">
                  <span className="text-sm">{TIPO_ERRO_LABEL[item.tipo]}</span>
                  <Badge variant="secondary">{item.total}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Por etapa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Erros por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalPorEtapa
              .sort((a, b) => b.total - a.total)
              .map((item) => (
                <div key={item.etapa} className="flex items-center justify-between">
                  <span className="text-sm">{LABEL_ETAPA[item.etapa]}</span>
                  <Badge variant="secondary">{item.total}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Lista de erros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erros em Aberto</CardTitle>
        </CardHeader>
        <CardContent>
          {erros.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum erro em aberto 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {erros.map((erro) => (
                <div key={erro.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {TIPO_ERRO_LABEL[erro.tipoErro]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {LABEL_ETAPA[erro.etapa]}
                      </Badge>
                    </div>
                    <Link
                      href={`/competencias/${erro.card.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver card
                    </Link>
                  </div>
                  <p className="text-sm">
                    {erro.card.empresa.nomeFantasia ?? erro.card.empresa.razaoSocial}
                  </p>
                  <p className="text-sm text-muted-foreground">{erro.descricao ?? "—"}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
