export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GruposManager } from "@/components/configuracoes/GruposManager";

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const [grupos, empresas] = await Promise.all([
    prisma.grupo.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      include: {
        _count: { select: { empresas: true } },
        empresas: { select: { empresaId: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.empresa.findMany({
      where: { escritorioId: usuario.escritorioId, ativa: true },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  const empresasLookup = empresas.map((e) => ({ id: e.id, nome: e.nomeFantasia ?? e.razaoSocial }));

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
          empresasCount: g._count.empresas,
          empresaIds: g.empresas.map((e) => e.empresaId),
        }))}
        empresas={empresasLookup}
      />
    </div>
  );
}
