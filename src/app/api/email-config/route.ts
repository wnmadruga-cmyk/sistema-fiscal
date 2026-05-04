import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  ativo: z.boolean().optional(),
  horaEnvio: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").optional(),
  destinatarios: z.array(z.string().email()).optional(),
  assunto: z.string().min(1).optional(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return unauthorized();

    const config = await prisma.configEmailNotificacao.findUnique({
      where: { escritorioId: usuario.escritorioId },
    });

    return ok(config ?? {
      ativo: false,
      horaEnvio: "08:00",
      destinatarios: [],
      assunto: "Relatório Diário — Fluxo Fiscal",
      ultimoEnvio: null,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return unauthorized();

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const config = await prisma.configEmailNotificacao.upsert({
      where: { escritorioId: usuario.escritorioId },
      update: { ...parsed.data, updatedAt: new Date() },
      create: { escritorioId: usuario.escritorioId, ...parsed.data },
    });

    return ok(config);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
