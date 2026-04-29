import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  codigoInterno: z.string().optional(),
  razaoSocial: z.string().min(1, "Razão social obrigatória"),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  regimeTributarioId: z.string().optional(),
  tipoAtividadeId: z.string().optional(),
  prioridadeId: z.string().optional(),
  filialId: z.string().optional(),
  respBuscaId: z.string().optional(),
  respElaboracaoId: z.string().optional(),
  respConferenciaId: z.string().optional(),
  diaVencimentoHonorarios: z.number().int().min(1).max(31).optional(),
  situacaoFolha: z.enum(["NAO_TEM", "RH", "FISCAL"]).default("NAO_TEM"),
  fatorR: z.boolean().default(false),
  fechaAutomatico: z.boolean().default(false),
  entregaImpressa: z.boolean().default(false),
  clienteBusca: z.boolean().default(false),
  escritorioEntrega: z.boolean().default(false),
  entregaDigisac: z.boolean().default(false),
  entregaSecretaria: z.boolean().default(false),
  semMovimentoTemp: z.boolean().default(false),
  exigirAbrirCard: z.boolean().default(false),
  exigirConferencia: z.boolean().default(false),
  observacaoGeral: z.string().optional(),
  grupoIds: z.array(z.string()).optional(),
  etiquetaIds: z.array(z.string()).optional(),
  checklistTemplateIds: z.array(z.string()).optional(),
  erroPossivelIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const grupoId = searchParams.get("grupoId");
    const regimeId = searchParams.get("regimeId");
    const ativa = searchParams.get("ativa");

    const empresas = await prisma.empresa.findMany({
      where: {
        escritorioId: usuario.escritorioId,
        ativa: ativa === "false" ? false : true,
        ...(grupoId && {
          grupos: { some: { grupoId } },
        }),
        ...(regimeId && { regimeTributarioId: regimeId }),
        ...(search && {
          OR: [
            { razaoSocial: { contains: search, mode: "insensitive" } },
            { nomeFantasia: { contains: search, mode: "insensitive" } },
            { cnpj: { contains: search } },
          ],
        }),
      },
      include: {
        regimeTributario: true,
        tipoAtividade: true,
        prioridade: true,
        respBusca: { select: { id: true, nome: true, avatar: true } },
        respElaboracao: { select: { id: true, nome: true, avatar: true } },
        respConferencia: { select: { id: true, nome: true, avatar: true } },
        grupos: { include: { grupo: true } },
        etiquetas: { include: { etiqueta: true } },
      },
      orderBy: { razaoSocial: "asc" },
    });

    return ok(empresas);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { grupoIds, etiquetaIds, checklistTemplateIds, erroPossivelIds, ...data } = parsed.data;

    const empresa = await prisma.empresa.create({
      data: {
        ...data,
        escritorioId: usuario.escritorioId,
        email: data.email || undefined,
        cnpj: data.cnpj || undefined,
        cpf: data.cpf || undefined,
        codigoInterno: data.codigoInterno || undefined,
        grupos: grupoIds?.length
          ? { create: grupoIds.map((grupoId) => ({ grupoId })) }
          : undefined,
        etiquetas: etiquetaIds?.length
          ? { create: etiquetaIds.map((etiquetaId) => ({ etiquetaId })) }
          : undefined,
        checklistsVinculados: checklistTemplateIds?.length
          ? { create: checklistTemplateIds.map((templateId) => ({ templateId })) }
          : undefined,
        errosVinculados: erroPossivelIds?.length
          ? { create: erroPossivelIds.map((erroId) => ({ erroId })) }
          : undefined,
      },
      include: {
        regimeTributario: true,
        tipoAtividade: true,
        prioridade: true,
        grupos: { include: { grupo: true } },
        etiquetas: { include: { etiqueta: true } },
      },
    });

    return created(empresa);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
