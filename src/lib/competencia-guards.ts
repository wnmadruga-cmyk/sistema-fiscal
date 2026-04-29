import { prisma } from "@/lib/prisma";

export async function assertInlineAllowed(cardId: string, escritorioId: string) {
  const card = await prisma.competenciaCard.findFirst({
    where: { id: cardId, empresa: { escritorioId } },
    select: {
      empresa: {
        select: {
          exigirAbrirCard: true,
          grupos: { select: { grupo: { select: { exigirAbrirCard: true } } } },
        },
      },
    },
  });
  if (!card) return { ok: false as const, reason: "Card não encontrado" };
  if (card.empresa.exigirAbrirCard) {
    return { ok: false as const, reason: "Esta empresa exige abrir o card" };
  }
  if (card.empresa.grupos.some((g) => g.grupo.exigirAbrirCard)) {
    return { ok: false as const, reason: "Grupo da empresa exige abrir o card" };
  }
  return { ok: true as const };
}
