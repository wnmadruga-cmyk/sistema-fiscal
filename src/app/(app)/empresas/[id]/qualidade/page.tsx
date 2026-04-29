export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { competenciaLabel } from "@/lib/competencia-utils";

export default async function QualidadeEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const empresa = await prisma.empresa.findFirst({
    where: { id, escritorioId: usuario.escritorioId },
    select: { id: true, razaoSocial: true, codigoInterno: true },
  });
  if (!empresa) notFound();

  const cards = await prisma.competenciaCard.findMany({
    where: { empresaId: id, notaQualidade: { not: null } },
    select: {
      id: true,
      competencia: true,
      notaQualidade: true,
      concluidoEm: true,
      qualidade: {
        where: { erroPossivelId: { not: null } },
        select: {
          id: true,
          statusItem: true,
          observacao: true,
          pesoSnapshot: true,
          erroPossivel: { select: { nome: true, categorias: true } },
        },
      },
    },
    orderBy: { competencia: "desc" },
  });

  const notas = cards
    .map((c) => Number(c.notaQualidade))
    .filter((n) => !Number.isNaN(n));
  const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Qualidade — {empresa.razaoSocial}</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de conferências e nota por competência
          </p>
        </div>
        <Link href={`/empresas/${empresa.id}`} className="text-sm text-primary hover:underline">
          ← Voltar ao cadastro
        </Link>
      </div>

      {media !== null && (
        <div className="border rounded-md p-4 flex items-center justify-between bg-muted/30">
          <span className="text-sm">Nota média ({notas.length} competência{notas.length === 1 ? "" : "s"})</span>
          <span className="text-2xl font-bold">{media.toFixed(1)}/100</span>
        </div>
      )}

      {cards.length === 0 && (
        <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">
          Nenhuma conferência registrada com nota ainda.
        </div>
      )}

      <div className="space-y-3">
        {cards.map((c) => {
          const nota = Number(c.notaQualidade);
          const erros = c.qualidade.filter((q) => q.statusItem === "COM_ERRO");
          const ressalvas = c.qualidade.filter((q) => q.statusItem === "RESSALVA");
          const oks = c.qualidade.filter((q) => q.statusItem === "APROVADO");
          return (
            <div key={c.id} className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Link href={`/competencias/${c.id}`} className="font-medium hover:underline">
                  {competenciaLabel(c.competencia)}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">OK {oks.length}</Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Ressalva {ressalvas.length}</Badge>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Erro {erros.length}</Badge>
                  <Badge className={nota >= 80 ? "bg-emerald-600" : nota >= 60 ? "bg-amber-600" : "bg-rose-600"}>
                    {nota.toFixed(1)}/100
                  </Badge>
                </div>
              </div>
              {(erros.length > 0 || ressalvas.length > 0) && (
                <div className="space-y-1.5">
                  {[...erros, ...ressalvas].map((q) => (
                    <div key={q.id} className="text-sm border-l-2 pl-3 py-1"
                      style={{ borderColor: q.statusItem === "COM_ERRO" ? "#e11d48" : "#d97706" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{q.erroPossivel?.nome ?? "—"}</span>
                        <Badge variant="outline" className="text-[10px]">Peso {q.pesoSnapshot}</Badge>
                        {q.erroPossivel?.categorias?.map((cat) => (
                          <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                        ))}
                      </div>
                      {q.observacao && (
                        <p className="text-xs text-muted-foreground mt-0.5">{q.observacao}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
