import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ok, serverError, unauthorized, notFound, noContent } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;

    const arquivo = await prisma.arquivo.findFirst({
      where: {
        id,
        OR: [
          { card: { empresa: { escritorioId: usuario.escritorioId } } },
          { comentario: { card: { empresa: { escritorioId: usuario.escritorioId } } } },
        ],
      },
    });
    if (!arquivo) return notFound();

    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(arquivo.bucket)
      .createSignedUrl(arquivo.path, 60 * 60);
    if (error || !data) return serverError(error ?? "Erro ao gerar URL");

    return ok({ ...arquivo, url: data.signedUrl });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;

    const arquivo = await prisma.arquivo.findFirst({
      where: {
        id,
        autorId: usuario.id,
        OR: [
          { card: { empresa: { escritorioId: usuario.escritorioId } } },
          { comentario: { card: { empresa: { escritorioId: usuario.escritorioId } } } },
        ],
      },
    });
    if (!arquivo) return notFound();

    const supabase = await createClient();
    await supabase.storage.from(arquivo.bucket).remove([arquivo.path]);
    await prisma.arquivo.delete({ where: { id } });

    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
