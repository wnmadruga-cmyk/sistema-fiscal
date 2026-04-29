"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Edit, CalendarDays, Download, Upload, FileSpreadsheet } from "lucide-react";
import { formatDocument } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type {
  Empresa,
  RegimeTributario,
  TipoAtividade,
  Prioridade,
  Usuario,
  Grupo,
  Etiqueta,
} from "@prisma/client";
import { toast } from "sonner";

type EmpresaComRelacoes = Empresa & {
  regimeTributario: RegimeTributario | null;
  tipoAtividade: TipoAtividade | null;
  prioridade: Prioridade | null;
  respBusca: { id: string; nome: string; avatar: string | null } | null;
  respElaboracao: { id: string; nome: string; avatar: string | null } | null;
  grupos: Array<{ grupo: Grupo }>;
  etiquetas: Array<{ etiqueta: Etiqueta }>;
};

interface EmpresasPageContentProps {
  empresas: EmpresaComRelacoes[];
  grupos: Grupo[];
  regimes: RegimeTributario[];
}

export function EmpresasPageContent({
  empresas,
  grupos,
  regimes,
}: EmpresasPageContentProps) {
  const [search, setSearch] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const router = useRouter();

  const filtradas = empresas.filter((e) => {
    const matchSearch =
      !search ||
      e.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
      (e.codigoInterno?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.cnpj?.includes(search) ?? false);

    const matchGrupo =
      !grupoFiltro || e.grupos.some((g) => g.grupo.id === grupoFiltro);

    return matchSearch && matchGrupo;
  });

  async function gerarCompetencias(empresaId: string) {
    const competenciaAtual = new Date();
    const ano = competenciaAtual.getFullYear();
    const mes = String(competenciaAtual.getMonth() + 1).padStart(2, "0");
    const comp = `${ano}-${mes}`;

    const res = await fetch("/api/competencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId, competencias: [comp] }),
    });

    if (res.ok) {
      toast.success("Competência gerada com sucesso!");
      router.push(`/competencias?empresaId=${empresaId}`);
    } else {
      toast.error("Erro ao gerar competência");
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtradas.length} empresa{filtradas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/empresas/import-template">
            <Button variant="outline" size="sm" type="button">
              <Download className="h-4 w-4" />
              Modelo Excel
            </Button>
          </a>
          <a
            href={`/api/empresas/export${search || grupoFiltro ? `?search=${encodeURIComponent(search)}&grupoId=${encodeURIComponent(grupoFiltro)}` : ""}`}
          >
            <Button variant="outline" size="sm" type="button">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
          </a>
          <Link href="/empresas/importar">
            <Button variant="outline" size="sm" type="button">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
          </Link>
          <Link href="/empresas/nova">
            <Button>
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={grupoFiltro}
          onChange={(e) => setGrupoFiltro(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        >
          <option value="">Todos os grupos</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      {filtradas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma empresa encontrada"
          description="Cadastre a primeira empresa para começar"
          action={
            <Link href="/empresas/nova">
              <Button>
                <Plus className="h-4 w-4" />
                Nova Empresa
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Doc</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Regime</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grupo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Responsável</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.map((empresa) => (
                <tr key={empresa.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {empresa.codigoInterno && (
                          <span className="text-muted-foreground font-mono mr-2">{empresa.codigoInterno}</span>
                        )}
                        {empresa.razaoSocial}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {empresa.cnpj
                      ? formatDocument(empresa.cnpj)
                      : empresa.cpf
                      ? formatDocument(empresa.cpf)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {empresa.regimeTributario && (
                      <Badge variant="secondary">
                        {empresa.regimeTributario.codigo}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {empresa.grupos.slice(0, 2).map(({ grupo }) => (
                        <span
                          key={grupo.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: grupo.cor ? `${grupo.cor}20` : undefined,
                            color: grupo.cor ?? undefined,
                          }}
                        >
                          {grupo.nome}
                        </span>
                      ))}
                      {empresa.grupos.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{empresa.grupos.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {empresa.respElaboracao && (
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          nome={empresa.respElaboracao.nome}
                          avatar={empresa.respElaboracao.avatar}
                          size="sm"
                        />
                        <span className="text-xs">{empresa.respElaboracao.nome.split(" ")[0]}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => gerarCompetencias(empresa.id)}
                        title="Gerar competência"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Link href={`/empresas/${empresa.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
