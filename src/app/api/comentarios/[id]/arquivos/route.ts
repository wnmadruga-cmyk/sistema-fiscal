import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ok, created, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";

const BUCKET = "comentarios";
const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id: comentarioId } = await params;

    const comentario = await prisma.comentario.findFirst({
      where: {
        id: comentarioId,
        card: { empresa: { escritorioId: usuario.escritorioId } },
      },
      select: { id: true, cardId: true },
    });
    if (!comentario) return notFound();

    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return badRequest("Nenhum arquivo enviado");

    const supabase = await createClient();
    const created_records = [];

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        return badRequest(`Arquivo "${file.name}" excede 25MB`);
      }

      const filename = `${Date.now()}-${safeName(file.name)}`;
      const path = `${comentario.cardId}/${comentarioId}/${filename}`;
      const buf = Buffer.from(await file.arrayBuffer());

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buf, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) return serverError(upErr);

      const arquivo = await prisma.arquivo.create({
        data: {
          cardId: comentario.cardId,
          comentarioId,
          autorId: usuario.id,
          nome: filename,
          nomeOriginal: file.name,
          tipo: file.type || "application/octet-stream",
          tamanho: file.size,
          bucket: BUCKET,
          path,
        },
      });
      created_records.push(arquivo);
    }

    return created(created_records);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id: comentarioId } = await params;

    const arquivos = await prisma.arquivo.findMany({
      where: {
        comentarioId,
        comentario: { card: { empresa: { escritorioId: usuario.escritorioId } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const supabase = await createClient();
    const withUrls = await Promise.all(
      arquivos.map(async (a) => {
        const { data } = await supabase.storage
          .from(a.bucket)
          .createSignedUrl(a.path, 60 * 60);
        return { ...a, url: data?.signedUrl ?? null };
      })
    );

    return ok(withUrls);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
