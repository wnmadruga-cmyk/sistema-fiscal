import "server-only";
import { prisma } from "@/lib/prisma";
import type { Lookups } from "@/lib/empresas-import-shared";

export async function loadLookups(escritorioId: string): Promise<Lookups> {
  const [regimes, atividades, prioridades, filiais, grupos, etiquetas, usuarios, formasChegada] =
    await Promise.all([
      prisma.regimeTributario.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, codigo: true },
      }),
      prisma.tipoAtividade.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
      }),
      prisma.prioridade.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
      }),
      prisma.filial.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true },
      }),
      prisma.grupo.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true },
      }),
      prisma.etiqueta.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
      }),
      prisma.usuario.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true, email: true },
      }),
      prisma.formaChegadaConfig.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true },
      }),
    ]);
  return { regimes, atividades, prioridades, filiais, grupos, etiquetas, usuarios, formasChegada };
}
