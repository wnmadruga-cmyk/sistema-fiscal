export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ErrosManager } from "@/components/configuracoes/ErrosManager";

const getErrosData = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.erroPossivel.findMany({
        where: { escritorioId, ativo: true },
        include: {
          empresas: { select: { empresaId: true } },
          grupos: { select: { grupoId: true } },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.empresa.findMany({
        where: { escritorioId, ativa: true },
        select: { id: true, razaoSocial: true, codigoInterno: true },
        orderBy: { razaoSocial: "asc" },
      }),
      prisma.grupo.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true, cor: true },
        orderBy: { nome: "asc" },
      }),
    ]),
  ["config-erros"],
  { revalidate: 300, tags: ["erros-possiveis"] }
);

export default async function ErrosPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [erros, empresas, grupos] = await getErrosData(usuario.escritorioId);

  const errosForUI = erros.map((e) => ({
    id: e.id,
    nome: e.nome,
    descricao: e.descricao,
    categorias: e.categorias,
    peso: e.peso,
    pesosCategoria: (e.pesosCategoria as Record<string, number>) ?? {},
    empresaIds: e.empresas.map((x) => x.empresaId),
    grupoIds: e.grupos.map((x) => x.grupoId),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Erros Possíveis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catálogo de erros — vincule a grupos ou empresas específicas
        </p>
      </div>
      <ErrosManager initial={errosForUI} empresas={empresas} grupos={grupos} />
    </div>
  );
}
