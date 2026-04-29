import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { competenciaAtual } from "@/lib/competencia-utils";
import { addDays } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });
  if (!usuario) redirect("/login");

  const competencia = competenciaAtual();
  const hoje = new Date();
  const em7dias = addDays(hoje, 7);

  const [
    cardsPendentes,
    cardsUrgentes,
    prazoProximo,
    notificacoes,
    resumoEtapas,
  ] = await Promise.all([
    prisma.competenciaCard.count({
      where: {
        responsavelId: usuario.id,
        competencia,
        status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
      },
    }),
    prisma.competenciaCard.count({
      where: {
        empresa: { escritorioId: usuario.escritorioId },
        competencia,
        urgente: true,
        status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
      },
    }),
    prisma.competenciaCard.findMany({
      where: {
        empresa: { escritorioId: usuario.escritorioId },
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
      where: { usuarioId: usuario.id, lida: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.competenciaCard.groupBy({
      by: ["etapaAtual"],
      where: {
        empresa: { escritorioId: usuario.escritorioId },
        competencia,
        status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
      },
      _count: { etapaAtual: true },
    }),
  ]);

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
