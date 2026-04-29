import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AppClientLayout } from "@/components/layout/AppClientLayout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });

  const notificacoesNaoLidas = usuario
    ? await prisma.notificacao.count({
        where: { usuarioId: usuario.id, lida: false },
      })
    : 0;

  return (
    <AppClientLayout>
      <Sidebar />
      <Header
        usuarioNome={usuario?.nome ?? user.email ?? "Usuário"}
        usuarioAvatar={usuario?.avatar}
        notificacoesNaoLidas={notificacoesNaoLidas}
      />
      <main className="pt-14 transition-all duration-300" id="app-main">
        {children}
      </main>
    </AppClientLayout>
  );
}
