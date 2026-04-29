import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, created } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  perfil: z.enum(["ADMIN", "GERENTE", "OPERACIONAL", "CONFERENTE"]).default("OPERACIONAL"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();

    const usuarios = await prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        avatar: true,
        ativo: true,
        createdAt: true,
      },
      orderBy: { nome: "asc" },
    });

    return ok(usuarios);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return unauthorized("Apenas admins e gerentes");

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const supabase = createAdminClient();
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return badRequest(authError?.message ?? "Erro ao criar usuário");
    }

    const novoUsuario = await prisma.usuario.create({
      data: {
        supabaseId: authData.user.id,
        escritorioId: usuario.escritorioId,
        nome: parsed.data.nome,
        email: parsed.data.email,
        perfil: parsed.data.perfil,
      },
    });

    return created(novoUsuario);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
