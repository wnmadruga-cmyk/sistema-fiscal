import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest, forbidden } from "@/lib/api-response";
import { z } from "zod";
import { assertInlineAllowed } from "@/lib/competencia-guards";
import { logCardEvento } from "@/lib/card-eventos";

const createSchema = z.object({
  texto: z.string().min(1),
  parentId: z.string().optional(),
  mencoes: z.array(z.string()).optional(),
  inline: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;

    const comentarios = await prisma.comentario.findMany({
      where: { cardId, deletado: false, parentId: null },
      include: {
        autor: { select: { id: true, nome: true, avatar: true } },
        mencoes: { include: { usuario: { select: { id: true, nome: true } } } },
        arquivos: true,
        respostas: {
          where: { deletado: false },
          include: {
            autor: { select: { id: true, nome: true, avatar: true } },
            mencoes: { include: { usuario: { select: { id: true, nome: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(comentarios);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { mencoes = [], inline, ...data } = parsed.data;

    if (inline) {
      const guard = await assertInlineAllowed(cardId, usuario.escritorioId);
      if (!guard.ok) return forbidden(guard.reason);
    }

    const comentario = await prisma.comentario.create({
      data: {
        ...data,
        cardId,
        autorId: usuario.id,
        mencoes: mencoes.length
          ? {
              create: mencoes.map((usuarioId) => ({ usuarioId })),
            }
          : undefined,
      },
      include: {
        autor: { select: { id: true, nome: true, avatar: true } },
        mencoes: { include: { usuario: { select: { id: true, nome: true } } } },
      },
    });

    // Criar notificações para menções
    if (mencoes.length) {
      await prisma.notificacao.createMany({
        data: mencoes
          .filter((uid) => uid !== usuario.id)
          .map((usuarioId) => ({
            usuarioId,
            tipo: "MENCAO" as const,
            titulo: `${usuario.nome} mencionou você`,
            mensagem: data.texto.substring(0, 100),
            linkRef: `/competencias/${cardId}`,
          })),
      });
    }

    await logCardEvento({
      cardId,
      usuarioId: usuario.id,
      tipo: "COMENTARIO",
      titulo: data.parentId ? "Resposta em comentário" : "Novo comentário",
      detalhes: data.texto.substring(0, 200),
    });

    return created(comentario);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
