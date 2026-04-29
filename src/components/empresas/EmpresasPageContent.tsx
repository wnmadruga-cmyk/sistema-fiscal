"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Edit, CalendarDays, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDocument } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type {
  Empresa,
  RegimeTributario,
  TipoAtividade,
  Prioridade,
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
  pagination: { page: number; perPageRaw: string; total: number; totalPages: number };
  searchInicial: string;
  grupoFiltroInicial: string;
}

export function EmpresasPageContent({
  empresas,
  grupos,
  pagination,
  searchInicial,
  grupoFiltroInicial,
}: EmpresasPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchInicial);

  // Debounced search — only push to URL after 350ms idle, and only if value changed
  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (searchInput === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) {
        params.set("search", searchInput);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.replace(`/empresas?${params.toString()}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, router, searchParams]);

  const handleGrupoChange = useCallback(
    (grupoId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (grupoId) {
        params.set("grupoId", grupoId);
      } else {
        params.delete("grupoId");
      }
      params.set("page", "1");
      router.replace(`/empresas?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.replace(`/empresas?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePerPageChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("perPage", value);
      params.set("page", "1");
      router.replace(`/empresas?${params.toString()}`);
    },
    [router, searchParams]
  );

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

  const { page, perPageRaw, total, totalPages } = pagination;
  const perPageNum = perPageRaw === "all" ? total : parseInt(perPageRaw) || 25;
  const startItem = total === 0 ? 0 : (page - 1) * perPageNum + 1;
  const endItem = Math.min(page * perPageNum, total);

  // Export URL uses current URL search params to reflect active filters
  const exportSearch = searchParams.get("search") ?? "";
  const exportGrupoId = searchParams.get("grupoId") ?? "";
  const exportHref = `/api/empresas/export${exportSearch || exportGrupoId ? `?search=${encodeURIComponent(exportSearch)}&grupoId=${encodeURIComponent(exportGrupoId)}` : ""}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} empresa{total !== 1 ? "s" : ""} no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/empresas/import-template">
            <Button variant="outline" size="sm" type="button">
              <Download className="h-4 w-4" />
              Modelo Excel
            </Button>
          </a>
          <a href={exportHref}>
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={grupoFiltroInicial}
          onChange={(e) => handleGrupoChange(e.target.value)}
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
      {empresas.length === 0 ? (
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
              {empresas.map((empresa) => (
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

      {/* Paginação */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Nenhuma empresa"
            : perPageRaw === "all"
            ? `Exibindo todas as ${total} empresa${total !== 1 ? "s" : ""}`
            : `Exibindo ${startItem}–${endItem} de ${total} empresa${total !== 1 ? "s" : ""}`}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Por página:</span>
            <select
              value={perPageRaw}
              onChange={(e) => handlePerPageChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 py-0 text-sm"
            >
              <option value="25">25</option>
              <option value="100">100</option>
              <option value="all">Todas</option>
            </select>
          </div>

          {perPageRaw !== "all" && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
