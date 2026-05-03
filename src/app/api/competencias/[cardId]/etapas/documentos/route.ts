import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";
import { EtapaCard, TipoDocumento } from "@prisma/client";

const schema = z.object({
  etapa: z.nativeEnum(EtapaCard),
  tipoDocumento: z.nativeEnum(TipoDocumento),
  marcado: z.boolean(),
});

const ETAPAS_COM_DOCS: EtapaCard[] = [
  EtapaCard.BUSCA_DOCUMENTOS,
  EtapaCard.BAIXAR_NOTAS_ACESSO,
  EtapaCard.PEDIR_NOTAS_RECEITA_PR,
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    await requireAuth();
    const { cardId } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { etapa, tipoDocumento, marcado } = parsed.data;

    if (!ETAPAS_COM_DOCS.includes(etapa)) {
      return badRequest("Marcação de documentos não disponível para esta etapa");
    }

    // Busca ou cria o registro da etapa
    const etapaRecord = await prisma.cardEtapa.findUnique({
      where: { cardId_etapa: { cardId, etapa } },
      select: { id: true, documentosMarcados: true },
    });

    let atualizados: TipoDocumento[];
    if (marcado) {
      atualizados = etapaRecord
        ? [...new Set([...etapaRecord.documentosMarcados, tipoDocumento])]
        : [tipoDocumento];
    } else {
      atualizados = etapaRecord
        ? etapaRecord.documentosMarcados.filter((d) => d !== tipoDocumento)
        : [];
    }

    const updated = await prisma.cardEtapa.upsert({
      where: { cardId_etapa: { cardId, etapa } },
      update: { documentosMarcados: atualizados },
      create: { cardId, etapa, status: "PENDENTE", documentosMarcados: atualizados },
      select: { documentosMarcados: true },
    });

    return ok(updated);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
