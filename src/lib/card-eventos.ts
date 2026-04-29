import { prisma } from "@/lib/prisma";
import type { TipoEventoCard } from "@prisma/client";

export async function logCardEvento(input: {
  cardId: string;
  usuarioId?: string | null;
  tipo: TipoEventoCard;
  titulo: string;
  detalhes?: string | null;
}) {
  try {
    await prisma.cardEvento.create({
      data: {
        cardId: input.cardId,
        usuarioId: input.usuarioId ?? null,
        tipo: input.tipo,
        titulo: input.titulo,
        detalhes: input.detalhes ?? null,
      },
    });
  } catch (e) {
    console.error("logCardEvento failed", e);
  }
}
