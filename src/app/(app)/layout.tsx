import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AppClientLayout } from "@/components/layout/AppClientLayout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabaseUser, usuario } = await getAuthUser();

  if (!supabaseUser) redirect("/login");

  let notificacoesNaoLidas = 0;
  try {
    if (usuario) {
      notificacoesNaoLidas = await prisma.notificacao.count({
        where: { usuarioId: usuario.id, lida: false },
      });
    }
  } catch (err) {
    console.error("[AppLayout] Erro ao consultar banco:", err);
  }

  return (
    <AppClientLayout>
      <Sidebar />
      <Header
        usuarioNome={usuario?.nome ?? supabaseUser.email ?? "Usuário"}
        usuarioAvatar={usuario?.avatar}
        notificacoesNaoLidas={notificacoesNaoLidas}
      />
      <main className="pt-14 transition-all duration-300" id="app-main">
        {children}
      </main>
    </AppClientLayout>
  );
}
