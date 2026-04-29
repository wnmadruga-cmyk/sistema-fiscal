import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const TIPOS = ["NFE", "NFCE", "NOTA_SERVICO", "CTE", "RECIBO_ALUGUEL"] as const;

const docSchema = z.object({
  tipoDocumento: z.enum(TIPOS),
  ativo: z.boolean().default(true),
  origem: z.enum(["ESCRITORIO", "TERCEIROS"]).default("ESCRITORIO"),
  nomeSistema: z.string().optional().nullable(),
  formaChegadaId: z.string().optional().nullable(),
  urlAcesso: z.string().optional().nullable(),
  loginAcesso: z.string().optional().nullable(),
  senhaAcesso: z.string().optional().nullable(),
  tipoPortal: z.enum(["NACIONAL", "MUNICIPAL"]).optional().nullable(),
  urlPortal: z.string().optional().nullable(),
  loginPortal: z.string().optional().nullable(),
  senhaPortal: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

const bodySchema = z.object({ documentos: z.array(docSchema) });

async function ensureEmpresa(id: string, escritorioId: string) {
  return prisma.empresa.findFirst({ where: { id, escritorioId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const empresa = await ensureEmpresa(id, usuario.escritorioId);
    if (!empresa) return notFound("Empresa");
    const docs = await prisma.configDocumento.findMany({ where: { empresaId: id } });
    return ok(docs);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const empresa = await ensureEmpresa(id, usuario.escritorioId);
    if (!empresa) return notFound("Empresa");

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const docs = parsed.data.documentos;

    await prisma.$transaction(async (tx) => {
      for (const d of docs) {
        const isNS = d.tipoDocumento === "NOTA_SERVICO";
        const isTerceiros = d.origem === "TERCEIROS";
        const data = {
          ativo: d.ativo,
          origem: d.origem,
          nomeSistema: !isNS && isTerceiros ? d.nomeSistema ?? null : null,
          formaChegadaId: !isNS && isTerceiros ? d.formaChegadaId ?? null : null,
          urlAcesso: !isNS ? d.urlAcesso ?? null : null,
          loginAcesso: !isNS ? d.loginAcesso ?? null : null,
          senhaAcesso: !isNS ? d.senhaAcesso ?? null : null,
          tipoPortal: isNS ? d.tipoPortal ?? null : null,
          urlPortal: isNS && d.tipoPortal === "MUNICIPAL" ? d.urlPortal ?? null : null,
          loginPortal: isNS && d.tipoPortal === "MUNICIPAL" ? d.loginPortal ?? null : null,
          senhaPortal: isNS && d.tipoPortal === "MUNICIPAL" ? d.senhaPortal ?? null : null,
          observacao: d.observacao ?? null,
        };
        await tx.configDocumento.upsert({
          where: { empresaId_tipoDocumento: { empresaId: id, tipoDocumento: d.tipoDocumento } },
          create: { empresaId: id, tipoDocumento: d.tipoDocumento, ...data },
          update: data,
        });
      }
    });

    const all = await prisma.configDocumento.findMany({ where: { empresaId: id } });
    return ok(all);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
