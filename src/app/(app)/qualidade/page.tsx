import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { QualidadeDashboard } from "@/components/qualidade/QualidadeDashboard";

const getQualidadeData = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.controleQualidade.findMany({
        where: {
          card: { empresa: { escritorioId } },
          resolvido: false,
        },
        include: {
          card: {
            include: {
              empresa: { select: { razaoSocial: true, nomeFantasia: true } },
            },
          },
          responsavel: { select: { id: true, nome: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.controleQualidade.groupBy({
        by: ["tipoErro"],
        where: { card: { empresa: { escritorioId } } },
        _count: { tipoErro: true },
      }),
      prisma.controleQualidade.groupBy({
        by: ["etapa"],
        where: { card: { empresa: { escritorioId } } },
        _count: { etapa: true },
      }),
    ]),
  ["qualidade-page"],
  { revalidate: 60, tags: ["qualidade"] }
);

export default async function QualidadePage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [erros, totalPorTipo, totalPorEtapa] = await getQualidadeData(usuario.escritorioId);

  return (
    <QualidadeDashboard
      erros={erros}
      totalPorTipo={totalPorTipo.map((t) => ({
        tipo: t.tipoErro,
        total: t._count.tipoErro,
      }))}
      totalPorEtapa={totalPorEtapa.map((t) => ({
        etapa: t.etapa,
        total: t._count.etapa,
      }))}
    />
  );
}
