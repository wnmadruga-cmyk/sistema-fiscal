export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { TransferirResponsaveisManager } from "@/components/configuracoes/TransferirResponsaveisManager";

export default async function ResponsaveisPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [empresas, usuarios] = await Promise.all([
    prisma.empresa.findMany({
      where: { escritorioId: usuario.escritorioId, ativa: true },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        codigoInterno: true,
        respBuscaId: true,
        respElaboracaoId: true,
        respConferenciaId: true,
      },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Transferência de Responsáveis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione empresas e transfira o responsável em lote, de forma permanente ou para uma competência específica.
        </p>
      </div>
      <TransferirResponsaveisManager empresas={empresas} usuarios={usuarios} />
    </div>
  );
}
