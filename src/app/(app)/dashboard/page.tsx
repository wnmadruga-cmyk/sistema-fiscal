import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { competenciaAtual } from "@/lib/competencia-utils";
import { addDays } from "date-fns";

const getDashboardData = unstable_cache(
  async (usuarioId: string, escritorioId: string, competencia: string) => {
    const hoje = new Date();
    const em7dias = addDays(hoje, 7);

    return Promise.all([
      prisma.competenciaCard.count({
        where: {
          responsavelId: usuarioId,
          competencia,
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
      }),
      prisma.competenciaCard.count({
        where: {
          empresa: { escritorioId },
          competencia,
          urgente: true,
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
      }),
      prisma.competenciaCard.findMany({
        where: {
          empresa: { escritorioId },
          competencia,
          prazo: { lte: em7dias, gte: hoje },
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        include: {
          empresa: { select: { razaoSocial: true, nomeFantasia: true } },
          prioridade: true,
        },
        orderBy: { prazo: "asc" },
        take: 8,
      }),
      prisma.notificacao.findMany({
        where: { usuarioId, lida: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.competenciaCard.groupBy({
        by: ["etapaAtual"],
        where: {
          empresa: { escritorioId },
          competencia,
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        _count: { etapaAtual: true },
      }),
    ]);
  },
  ["dashboard-page"],
  { revalidate: 60, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const competencia = competenciaAtual();

  const [
    cardsPendentes,
    cardsUrgentes,
    prazoProximo,
    notificacoes,
    resumoEtapas,
  ] = await getDashboardData(usuario.id, usuario.escritorioId, competencia);

  return (
    <DashboardContent
      usuarioNome={usuario.nome}
      competencia={competencia}
      cardsPendentes={cardsPendentes}
      cardsUrgentes={cardsUrgentes}
      prazoProximo={prazoProximo}
      notificacoes={notificacoes}
      resumoEtapas={resumoEtapas.map((r) => ({
        etapa: r.etapaAtual,
        total: r._count.etapaAtual,
      }))}
    />
  );
}
