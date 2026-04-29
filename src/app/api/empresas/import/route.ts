import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, badRequest, serverError } from "@/lib/api-response";
import { loadLookups } from "@/lib/empresas-import-server";
import {
  validateRow,
  isRowEmpty,
  type ImportRowRaw,
} from "@/lib/empresas-import-shared";

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const escritorioId = usuario.escritorioId;

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) return badRequest("Payload inválido");
    const rawRows: ImportRowRaw[] = body.rows;

    const lookups = await loadLookups(escritorioId);

    const erros: Array<{ index: number; mensagem: string }> = [];
    const validados: Array<{ index: number; data: NonNullable<ReturnType<typeof validateRow>["data"]> }> = [];

    rawRows.forEach((raw, index) => {
      if (isRowEmpty(raw)) return;
      const v = validateRow(raw, lookups);
      if (v.data) validados.push({ index, data: v.data });
      else {
        const msg = Object.entries(v.errors)
          .map(([f, m]) => `${f}: ${m}`)
          .join(" | ");
        erros.push({ index, mensagem: msg });
      }
    });

    let criadas = 0;
    for (const v of validados) {
      const { grupoIds, etiquetaIds, configDocumentos, ...data } = v.data;
      try {
        await prisma.empresa.create({
          data: {
            ...data,
            escritorioId,
            grupos: grupoIds.length
              ? { create: grupoIds.map((grupoId) => ({ grupoId })) }
              : undefined,
            etiquetas: etiquetaIds.length
              ? { create: etiquetaIds.map((etiquetaId) => ({ etiquetaId })) }
              : undefined,
            configDocumentos: configDocumentos.length
              ? {
                  create: configDocumentos.map((doc) => ({
                    tipoDocumento: doc.tipoDocumento,
                    ativo: doc.ativo,
                    origem: doc.origem,
                    formaChegada: doc.formaChegada,
                    nomeSistema: doc.nomeSistema,
                  })),
                }
              : undefined,
          },
          select: { id: true },
        });
        criadas++;
      } catch (err) {
        const code = (err as { code?: string }).code;
        const msg =
          code === "P2002"
            ? "Já existe empresa com este CNPJ/CPF/código"
            : (err as Error).message ?? "Erro ao criar";
        erros.push({ index: v.index, mensagem: msg });
      }
    }

    return ok({ criadas, total: validados.length + erros.length, erros });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
