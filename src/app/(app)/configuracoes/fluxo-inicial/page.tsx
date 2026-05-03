export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { FluxoInicialManager } from "@/components/configuracoes/FluxoInicialManager";

export default async function FluxoInicialPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const regras = await prisma.regraFluxoInicial.findMany({
    where: { escritorioId: usuario.escritorioId },
    orderBy: { tipo: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fluxo Inicial da Competência</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure em qual etapa do fluxo cada competência começa, de acordo com as características da empresa.
        </p>
      </div>
      <FluxoInicialManager
        initial={regras.map((r) => ({
          id: r.id,
          tipo: r.tipo,
          etapaInicial: r.etapaInicial,
          ativo: r.ativo,
        }))}
      />
    </div>
  );
}
