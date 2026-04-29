import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { CardDetalheContent } from "@/components/competencias/CardDetalheContent";

export default async function CardDetalhePage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const { cardId } = await params;

  const card = await prisma.competenciaCard.findFirst({
    where: {
      id: cardId,
      empresa: { escritorioId: usuario.escritorioId },
    },
    include: {
      empresa: {
        include: {
          regimeTributario: true,
          tipoAtividade: true,
          prioridade: true,
          configDocumentos: true,
          configBuscas: {
            select: { id: true, nome: true, url: true, login: true, ativo: true },
          },
          grupos: { include: { grupo: { select: { id: true, nome: true, exigirConferencia: true } } } },
        },
      },
      prioridade: true,
      responsavel: { select: { id: true, nome: true, avatar: true, perfil: true } },
      etapas: {
        include: {
          respostas: {
            include: {
              item: true,
              usuario: { select: { id: true, nome: true } },
            },
          },
        },
      },
      etiquetas: { include: { etiqueta: true } },
      conferenciaResponsavel: { select: { id: true, nome: true, avatar: true } },
      qualidade: {
        include: {
          responsavel: { select: { id: true, nome: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      observacoesCard: {
        where: { ativa: true },
        include: {
          autor: { select: { id: true, nome: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!card) notFound();

  const cardSerialized = {
    ...card,
    notaQualidade: card.notaQualidade != null ? Number(card.notaQualidade) : null,
  };

  const [comentarios, usuarios, checklists] = await Promise.all([
    prisma.comentario.findMany({
      where: { cardId, deletado: false, parentId: null },
      include: {
        autor: { select: { id: true, nome: true, avatar: true } },
        mencoes: { include: { usuario: { select: { id: true, nome: true } } } },
        arquivos: true,
        respostas: {
          where: { deletado: false },
          include: {
            autor: { select: { id: true, nome: true, avatar: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true, avatar: true },
    }),
    prisma.checklistTemplate.findMany({
      where: { ativo: true },
      include: {
        itens: { where: { ativo: true }, orderBy: { ordem: "asc" } },
        empresas: { select: { empresaId: true } },
        grupos: { select: { grupoId: true } },
      },
      orderBy: [{ etapa: "asc" }, { ordem: "asc" }],
    }),
  ]);

  const grupoIds = card.empresa.grupos.map((g) => g.grupo.id);
  const checklistsAplicaveis = checklists.filter((c) =>
    c.escopo === "GLOBAL" ||
    (c.escopo === "GRUPO" && c.grupos.some((g) => grupoIds.includes(g.grupoId))) ||
    (c.escopo === "EMPRESA" && c.empresas.some((e) => e.empresaId === card.empresa.id))
  );

  return (
    <CardDetalheContent
      card={cardSerialized}
      comentarios={comentarios}
      usuarios={usuarios}
      checklists={checklistsAplicaveis}
      usuarioAtual={usuario}
    />
  );
}
