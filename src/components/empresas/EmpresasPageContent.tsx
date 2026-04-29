"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, Building2, Edit, CalendarDays,
  Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatDocument } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Empresa, RegimeTributario, TipoAtividade, Prioridade, Grupo, Etiqueta } from "@prisma/client";
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
  grupos: Grupo[];
  regimes: RegimeTributario[];
}

export function EmpresasPageContent({ grupos }: EmpresasPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const perPageRaw = searchParams.get("perPage") ?? "25";
  const grupoFiltro = searchParams.get("grupoId") ?? "";
  const searchParam = searchParams.get("search") ?? "";

  // Local input state — debounced to URL
  const [searchInput, setSearchInput] = useState(searchParam);

  // Sync input if URL changes externally (e.g. browser back)
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Debounce: push to URL 350ms after typing stops
  useEffect(() => {
    if (searchInput === searchParam) return;
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
  }, [searchInput, searchParam, router, searchParams]);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["empresas-list", page, perPageRaw, searchParam, grupoFiltro],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: perPageRaw,
        ...(searchParam && { search: searchParam }),
        ...(grupoFiltro && { grupoId: grupoFiltro }),
      });
      const res = await fetch(`/api/empresas?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar empresas");
      const json = await res.json();
      return json.data as { empresas: EmpresaComRelacoes[]; total: number };
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev, // keep previous data visible while loading new page
  });

  const empresas = data?.empresas ?? [];
  const total = data?.total ?? 0;
  const perPageNum = perPageRaw === "all" ? total : parseInt(perPageRaw) || 25;
  const totalPages = perPageRaw === "all" ? 1 : Math.ceil(total / perPageNum);
  const startItem = total === 0 ? 0 : (page - 1) * perPageNum + 1;
  const endItem = Math.min(page * perPageNum, total);

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      router.replace(`/empresas?${params.toString()}`);
    },
    [router, searchParams]
  );

  const [gerandoId, setGerandoId] = useState<string | null>(null);

  async function gerarCompetencias(empresaId: string) {
    setGerandoId(empresaId);
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, "0");
    const comp = `${ano}-${mes}`;

    try {
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
    } finally {
      setGerandoId(null);
    }
  }

  const exportHref = `/api/empresas/export${searchParam || grupoFiltro ? `?search=${encodeURIComponent(searchParam)}&grupoId=${encodeURIComponent(grupoFiltro)}` : ""}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Carregando..." : `${total} empresa${total !== 1 ? "s" : ""} no total`}
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
          value={grupoFiltro}
          onChange={(e) => navigate({ grupoId: e.target.value, page: "1" })}
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
      {isLoading && !isPlaceholderData ? (
        <TableSkeleton />
      ) : empresas.length === 0 ? (
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
        <div className={`border rounded-xl overflow-hidden transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
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
                    <p className="font-medium">
                      {empresa.codigoInterno && (
                        <span className="text-muted-foreground font-mono mr-2">{empresa.codigoInterno}</span>
                      )}
                      {empresa.razaoSocial}
                    </p>
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
                      <Badge variant="secondary">{empresa.regimeTributario.codigo}</Badge>
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
                        <span className="text-xs text-muted-foreground">+{empresa.grupos.length - 2}</span>
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
                        disabled={gerandoId === empresa.id}
                        title="Gerar competência"
                      >
                        <CalendarDays className={`h-4 w-4 ${gerandoId === empresa.id ? "animate-pulse" : ""}`} />
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
          {isLoading
            ? "Carregando..."
            : total === 0
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
              onChange={(e) => navigate({ perPage: e.target.value, page: "1" })}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
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
                onClick={() => navigate({ page: String(page - 1) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate({ page: String(page + 1) })}
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

function TableSkeleton() {
  return (
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
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded" /></td>
              <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
              <td className="px-4 py-3"><Skeleton className="h-8 w-16 ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
