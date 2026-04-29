import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("E-mail inválido").optional(),
  perfil: z.enum(["ADMIN", "GERENTE", "OPERACIONAL", "CONFERENTE"]).optional(),
  ativo: z.boolean().optional(),
  novaSenha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  responsabilidades: z.array(z.object({
    empresaId: z.string(),
    busca: z.boolean().default(false),
    elaboracao: z.boolean().default(false),
    conferencia: z.boolean().default(false),
  })).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;

    const isSelf = usuario.id === id;
    const isAdmin = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
    if (!isAdmin && !isSelf) return unauthorized();

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const target = await prisma.usuario.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!target) return notFound();

    const { responsabilidades, novaSenha, email, ...data } = parsed.data;

    // Atualiza e-mail e/ou senha no Supabase Auth (requer service role)
    if (email || novaSenha) {
      const supabase = createAdminClient();
      const authUpdate: { email?: string; password?: string } = {};
      if (email) authUpdate.email = email;
      if (novaSenha) authUpdate.password = novaSenha;

      const { error: authError } = await supabase.auth.admin.updateUserById(
        target.supabaseId,
        authUpdate
      );
      if (authError) return badRequest(authError.message);
    }

    await prisma.$transaction(async (tx) => {
      const prismaData: Record<string, unknown> = { ...data };
      if (email) prismaData.email = email;

      if (Object.keys(prismaData).length > 0) {
        await tx.usuario.update({ where: { id }, data: prismaData });
      }

      if (responsabilidades) {
        const empresaIds = responsabilidades.map((r) => r.empresaId);
        const empresas = await tx.empresa.findMany({
          where: { id: { in: empresaIds }, escritorioId: usuario.escritorioId },
          select: { id: true },
        });
        const validIds = new Set(empresas.map((e) => e.id));

        await tx.empresa.updateMany({
          where: { escritorioId: usuario.escritorioId, respBuscaId: id },
          data: { respBuscaId: null },
        });
        await tx.empresa.updateMany({
          where: { escritorioId: usuario.escritorioId, respElaboracaoId: id },
          data: { respElaboracaoId: null },
        });
        await tx.empresa.updateMany({
          where: { escritorioId: usuario.escritorioId, respConferenciaId: id },
          data: { respConferenciaId: null },
        });

        for (const r of responsabilidades) {
          if (!validIds.has(r.empresaId)) continue;
          await tx.empresa.update({
            where: { id: r.empresaId },
            data: {
              ...(r.busca ? { respBuscaId: id } : {}),
              ...(r.elaboracao ? { respElaboracaoId: id } : {}),
              ...(r.conferencia ? { respConferenciaId: id } : {}),
            },
          });
        }
      }
    });

    return ok({ id });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return unauthorized();
    const { id } = await params;
    if (id === usuario.id) return badRequest("Não pode remover a si mesmo");

    const target = await prisma.usuario.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!target) return notFound();

    await prisma.usuario.update({ where: { id }, data: { ativo: false } });
    return ok({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
