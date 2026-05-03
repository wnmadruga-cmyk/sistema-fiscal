export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { GruposManager } from "@/components/configuracoes/GruposManager";

const getGruposData = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.grupo.findMany({
        where: { escritorioId, ativo: true },
        include: {
          _count: { select: { empresas: true } },
          empresas: { select: { empresaId: true } },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.empresa.findMany({
        where: { escritorioId, ativa: true },
        select: { id: true, razaoSocial: true, nomeFantasia: true, codigoInterno: true },
        orderBy: { razaoSocial: "asc" },
      }),
    ]),
  ["config-grupos"],
  { revalidate: 300, tags: ["grupos"] }
);

export default async function GruposPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [grupos, empresas] = await getGruposData(usuario.escritorioId);
  const empresasLookup = empresas.map((e) => ({ id: e.id, nome: e.nomeFantasia ?? e.razaoSocial, codigoInterno: e.codigoInterno }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Grupos de Empresas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agrupe empresas para aplicar checklists e erros em massa
        </p>
      </div>
      <GruposManager
        initial={grupos.map((g) => ({
          id: g.id,
          nome: g.nome,
          descricao: g.descricao,
          cor: g.cor,
          diasPrazo: g.diasPrazo,
          sobrepoePrioridade: g.sobrepoePrioridade,
          exigirAbrirCard: g.exigirAbrirCard,
          exigirConferencia: g.exigirConferencia,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          etapaInicial: (g as any).etapaInicial ?? null,
          empresasCount: g._count.empresas,
          empresaIds: g.empresas.map((e) => e.empresaId),
        }))}
        empresas={empresasLookup}
      />
    </div>
  );
}
