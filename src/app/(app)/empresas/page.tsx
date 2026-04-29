import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EmpresasPageContent } from "@/components/empresas/EmpresasPageContent";

const getEmpresasPageData = unstable_cache(
  async (escritorioId: string, usuarioId: string, perfil: string) => {
    const isPrivileged = perfil === "ADMIN" || perfil === "GERENTE";
    const empresaWhere = isPrivileged
      ? { escritorioId, ativa: true }
      : perfil === "CONFERENTE"
      ? { escritorioId, ativa: true, respConferenciaId: usuarioId }
      : { escritorioId, ativa: true, OR: [{ respBuscaId: usuarioId }, { respElaboracaoId: usuarioId }] };

    return Promise.all([
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
      }),
      prisma.grupo.findMany({
        where: { escritorioId, ativo: true },
        orderBy: { nome: "asc" },
      }),
      prisma.regimeTributario.findMany({ where: { ativo: true } }),
    ]);
  },
  ["empresas-page"],
  { revalidate: 60, tags: ["empresas"] }
);

export default async function EmpresasPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [empresas, grupos, regimes] = await getEmpresasPageData(
    usuario.escritorioId,
    usuario.id,
    usuario.perfil
  );

  return (
    <EmpresasPageContent
      empresas={empresas}
      grupos={grupos}
      regimes={regimes}
    />
  );
}
