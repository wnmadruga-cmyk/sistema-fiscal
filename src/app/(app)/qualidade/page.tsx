import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { QualidadeDashboard } from "@/components/qualidade/QualidadeDashboard";

export default async function QualidadePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });
  if (!usuario) redirect("/login");

  const [erros, totalPorTipo, totalPorEtapa] = await Promise.all([
    prisma.controleQualidade.findMany({
      where: {
        card: { empresa: { escritorioId: usuario.escritorioId } },
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
      where: { card: { empresa: { escritorioId: usuario.escritorioId } } },
      _count: { tipoErro: true },
    }),
    prisma.controleQualidade.groupBy({
      by: ["etapa"],
      where: { card: { empresa: { escritorioId: usuario.escritorioId } } },
      _count: { etapa: true },
    }),
  ]);

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
