import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, forbidden } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  empresaIds: z.array(z.string()).min(1),
  tipo: z.enum(["busca", "elaboracao", "conferencia"]),
  responsavelId: z.string().nullable(),
  permanente: z.boolean(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") {
      return forbidden("Apenas admins e gerentes podem transferir responsáveis");
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { empresaIds, tipo, responsavelId, permanente, competencia } = parsed.data;

    // Validate empresas belong to this escritório
    const empresas = await prisma.empresa.findMany({
      where: { id: { in: empresaIds }, escritorioId: usuario.escritorioId },
      select: { id: true },
    });
    const validIds = empresas.map((e) => e.id);
    if (validIds.length === 0) return badRequest("Nenhuma empresa válida");

    const campoEmpresa = tipo === "busca"
      ? "respBuscaId"
      : tipo === "elaboracao"
      ? "respElaboracaoId"
      : "respConferenciaId";

    if (permanente) {
      await prisma.$transaction(async (tx) => {
        // Update empresa responsible field
        await tx.empresa.updateMany({
          where: { id: { in: validIds } },
          data: { [campoEmpresa]: responsavelId },
        });

        // Also update open CompetenciaCards (not CONCLUIDO status) for these empresas
        // For type "elaboracao" we update card.responsavelId
        if (tipo === "elaboracao") {
          await tx.competenciaCard.updateMany({
            where: {
              empresaId: { in: validIds },
              status: { not: "CONCLUIDO" },
            },
            data: { responsavelId },
          });
        }
      });
    } else {
      // Only for a specific competencia
      if (!competencia) return badRequest("Competência obrigatória para transferência não permanente");

      if (tipo === "elaboracao") {
        await prisma.competenciaCard.updateMany({
          where: {
            empresaId: { in: validIds },
            competencia,
          },
          data: { responsavelId },
        });
      }
      // For busca/conferencia, there's no card-level field — only empresa level makes sense
      // So non-permanent for those types is a no-op but we still respond ok
    }

    return ok({ updated: validIds.length });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
