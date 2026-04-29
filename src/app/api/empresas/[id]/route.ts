import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ok,
  noContent,
  serverError,
  unauthorized,
  notFound,
  badRequest,
} from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  codigoInterno: z.string().optional(),
  razaoSocial: z.string().min(1).optional(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  regimeTributarioId: z.string().optional().nullable(),
  tipoAtividadeId: z.string().optional().nullable(),
  prioridadeId: z.string().optional().nullable(),
  filialId: z.string().optional().nullable(),
  respBuscaId: z.string().optional().nullable(),
  respElaboracaoId: z.string().optional().nullable(),
  respConferenciaId: z.string().optional().nullable(),
  diaVencimentoHonorarios: z.number().int().min(1).max(31).optional().nullable(),
  situacaoFolha: z.enum(["NAO_TEM", "RH", "FISCAL"]).optional(),
  fatorR: z.boolean().optional(),
  fechaAutomatico: z.boolean().optional(),
  entregaImpressa: z.boolean().optional(),
  clienteBusca: z.boolean().optional(),
  escritorioEntrega: z.boolean().optional(),
  entregaDigisac: z.boolean().optional(),
  entregaSecretaria: z.boolean().optional(),
  semMovimentoTemp: z.boolean().optional(),
  exigirAbrirCard: z.boolean().optional(),
  exigirConferencia: z.boolean().optional(),
  observacaoGeral: z.string().optional(),
  ativa: z.boolean().optional(),
  grupoIds: z.array(z.string()).optional(),
  etiquetaIds: z.array(z.string()).optional(),
  checklistTemplateIds: z.array(z.string()).optional(),
  checklistExcluidosIds: z.array(z.string()).optional(),
  erroPossivelIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;

    const empresa = await prisma.empresa.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
      include: {
        regimeTributario: true,
        tipoAtividade: true,
        prioridade: true,
        respBusca: { select: { id: true, nome: true, avatar: true } },
        respElaboracao: { select: { id: true, nome: true, avatar: true } },
        respConferencia: { select: { id: true, nome: true, avatar: true } },
        grupos: { include: { grupo: true } },
        etiquetas: { include: { etiqueta: true } },
        configDocumentos: { include: { formaChegadaConfig: { select: { id: true, nome: true } } } },
        configBuscas: { select: { id: true, nome: true, url: true, login: true, senhaHash: true, observacao: true, ativo: true } },
        checklistsVinculados: { select: { templateId: true } },
      },
    });

    if (!empresa) return notFound("Empresa não encontrada");
    return ok(empresa);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { grupoIds, etiquetaIds, checklistTemplateIds, checklistExcluidosIds, erroPossivelIds, ...data } = parsed.data;

    const empresa = await prisma.$transaction(async (tx) => {
      if (grupoIds !== undefined) {
        await tx.empresaGrupo.deleteMany({ where: { empresaId: id } });
        if (grupoIds.length) {
          await tx.empresaGrupo.createMany({
            data: grupoIds.map((grupoId) => ({ empresaId: id, grupoId })),
          });
        }
      }

      if (etiquetaIds !== undefined) {
        await tx.empresaEtiqueta.deleteMany({ where: { empresaId: id } });
        if (etiquetaIds.length) {
          await tx.empresaEtiqueta.createMany({
            data: etiquetaIds.map((etiquetaId) => ({ empresaId: id, etiquetaId })),
          });
        }
      }

      if (checklistTemplateIds !== undefined) {
        await tx.checklistTemplateEmpresa.deleteMany({ where: { empresaId: id } });
        if (checklistTemplateIds.length) {
          await tx.checklistTemplateEmpresa.createMany({
            data: checklistTemplateIds.map((templateId) => ({ empresaId: id, templateId })),
          });
        }
      }

      if (checklistExcluidosIds !== undefined) {
        await tx.checklistExclusaoEmpresa.deleteMany({ where: { empresaId: id } });
        if (checklistExcluidosIds.length) {
          await tx.checklistExclusaoEmpresa.createMany({
            data: checklistExcluidosIds.map((templateId) => ({ empresaId: id, templateId })),
          });
        }
      }

      if (erroPossivelIds !== undefined) {
        await tx.erroPossivelEmpresa.deleteMany({ where: { empresaId: id } });
        if (erroPossivelIds.length) {
          await tx.erroPossivelEmpresa.createMany({
            data: erroPossivelIds.map((erroId) => ({ empresaId: id, erroId })),
          });
        }
      }

      return tx.empresa.update({
        where: { id },
        data: {
          ...data,
          email: data.email || undefined,
          cnpj: data.cnpj === "" ? null : data.cnpj,
          cpf: data.cpf === "" ? null : data.cpf,
          codigoInterno: data.codigoInterno === "" ? null : data.codigoInterno,
        },
        include: {
          regimeTributario: true,
          tipoAtividade: true,
          prioridade: true,
          grupos: { include: { grupo: true } },
          etiquetas: { include: { etiqueta: true } },
        },
      });
    });

    return ok(empresa);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return unauthorized("Apenas admins e gerentes");
    const { id } = await params;

    await prisma.empresa.update({
      where: { id },
      data: { ativa: false },
    });
    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
