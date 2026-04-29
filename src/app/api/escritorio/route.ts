import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  usuarioConferenciaPadraoId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const escritorio = await prisma.escritorio.findUnique({
      where: { id: usuario.escritorioId },
    });
    return ok(escritorio);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN") return unauthorized("Apenas admins");

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const escritorio = await prisma.escritorio.update({
      where: { id: usuario.escritorioId },
      data: parsed.data,
    });
    return ok(escritorio);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
