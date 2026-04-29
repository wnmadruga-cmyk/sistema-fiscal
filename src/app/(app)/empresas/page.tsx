import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EmpresasPageContent } from "@/components/empresas/EmpresasPageContent";
import type { Prisma } from "@prisma/client";

// Dados estáticos dos dropdowns — raramente mudam
const getEmpresasDropdowns = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.grupo.findMany({ where: { escritorioId, ativo: true }, orderBy: { nome: "asc" } }),
      prisma.regimeTributario.findMany({ where: { ativo: true } }),
    ]),
  ["empresas-dropdowns"],
  { revalidate: 300, tags: ["grupos"] }
);

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string; search?: string; grupoId?: string }>;
}) {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const perPageRaw = sp.perPage ?? "25";
  const perPage = perPageRaw === "all" ? null : Math.max(10, Math.min(500, parseInt(perPageRaw) || 25));
  const search = sp.search?.trim() ?? "";
  const grupoId = sp.grupoId ?? "";

  const isPrivileged = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
  const baseWhere: Prisma.EmpresaWhereInput = isPrivileged
    ? { escritorioId: usuario.escritorioId, ativa: true }
    : usuario.perfil === "CONFERENTE"
    ? { escritorioId: usuario.escritorioId, ativa: true, respConferenciaId: usuario.id }
    : { escritorioId: usuario.escritorioId, ativa: true, OR: [{ respBuscaId: usuario.id }, { respElaboracaoId: usuario.id }] };

  // AND combina o filtro de acesso por perfil + busca + grupo sem conflito de chaves OR
  const empresaWhere: Prisma.EmpresaWhereInput = {
    AND: [
      baseWhere,
      ...(search ? [{
        OR: [
          { razaoSocial: { contains: search, mode: "insensitive" as const } },
          { codigoInterno: { contains: search, mode: "insensitive" as const } },
          { cnpj: { contains: search } },
        ],
      }] : []),
      ...(grupoId ? [{ grupos: { some: { grupoId } } }] : []),
    ],
  };

  const [total, empresas, [grupos, regimes]] = await Promise.all([
    prisma.empresa.count({ where: empresaWhere }),
    prisma.empresa.findMany({
      where: empresaWhere,
      include: {
        regimeTributario: true,
        tipoAtividade: true,
        prioridade: true,
        respBusca: { select: { id: true, nome: true, avatar: true } },
        respElaboracao: { select: { id: true, nome: true, avatar: true } },
        grupos: { include: { grupo: true } },
        etiquetas: { include: { etiqueta: true } },
      },
      orderBy: { razaoSocial: "asc" },
      ...(perPage ? { take: perPage, skip: (page - 1) * perPage } : {}),
    }),
    getEmpresasDropdowns(usuario.escritorioId),
  ]);

  const totalPages = perPage ? Math.ceil(total / perPage) : 1;

  return (
    <EmpresasPageContent
      empresas={empresas}
      grupos={grupos}
      regimes={regimes}
      pagination={{ page, perPageRaw, total, totalPages }}
      searchInicial={search}
      grupoFiltroInicial={grupoId}
    />
  );
}
