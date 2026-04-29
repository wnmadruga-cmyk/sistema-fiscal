export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ChecklistsManager } from "@/components/configuracoes/ChecklistsManager";

const getChecklistsData = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.checklistTemplate.findMany({
        where: {
          ativo: true,
          OR: [
            { escopo: "GLOBAL" },
            { empresas: { some: { empresa: { escritorioId } } } },
            { grupos: { some: { grupo: { escritorioId } } } },
          ],
        },
        include: {
          itens: { where: { ativo: true }, orderBy: { ordem: "asc" } },
          empresas: { select: { empresaId: true } },
          grupos: { select: { grupoId: true } },
        },
        orderBy: [{ etapa: "asc" }, { ordem: "asc" }],
      }),
      prisma.grupo.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true, cor: true },
        orderBy: { nome: "asc" },
      }),
      prisma.empresa.findMany({
        where: { escritorioId, ativa: true },
        select: { id: true, razaoSocial: true, codigoInterno: true },
        orderBy: { razaoSocial: "asc" },
      }),
    ]),
  ["config-checklists"],
  { revalidate: 300, tags: ["checklists"] }
);

export default async function ChecklistsPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [templates, grupos, empresas] = await getChecklistsData(usuario.escritorioId);

  const templatesNorm = templates.map((t) => ({
    id: t.id,
    nome: t.nome,
    descricao: t.descricao,
    etapa: t.etapa,
    escopo: t.escopo,
    obrigatorio: t.obrigatorio,
    ordem: t.ordem,
    empresaIds: t.empresas.map((x) => x.empresaId),
    grupoIds: t.grupos.map((x) => x.grupoId),
    itens: t.itens.map((i) => ({
      id: i.id,
      texto: i.texto,
      descricao: i.descricao,
      obrigatorio: i.obrigatorio,
      ordem: i.ordem,
    })),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Checklists</h1>
        <p className="text-sm text-muted-foreground mt-1">Templates por etapa — vincule a vários grupos ou empresas</p>
      </div>
      <ChecklistsManager initial={templatesNorm} grupos={grupos} empresas={empresas} />
    </div>
  );
}
