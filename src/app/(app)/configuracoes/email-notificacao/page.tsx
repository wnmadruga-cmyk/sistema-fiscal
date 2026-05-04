import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { EmailNotificacaoConfig } from "@/components/configuracoes/EmailNotificacaoConfig";

export default async function EmailNotificacaoPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");
  if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") redirect("/configuracoes");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Relatório por E-mail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o envio automático diário do relatório de andamento da competência
        </p>
      </div>
      <EmailNotificacaoConfig />

      <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">Configuração de SMTP necessária</p>
        <p>Para que o envio funcione, configure as seguintes variáveis de ambiente no servidor:</p>
        <pre className="bg-muted rounded p-2 font-mono text-[11px] overflow-x-auto">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=nome@exemplo.com`}</pre>
        <p>
          Para Gmail, gere uma <strong>senha de app</strong> em{" "}
          <span className="font-mono">Conta Google → Segurança → Verificação em duas etapas → Senhas de app</span>.
        </p>
        <p className="mt-2 font-semibold text-foreground">Cron automático (Vercel)</p>
        <p>
          O <code>vercel.json</code> já está configurado para disparar o cron a cada hora. Para proteger o endpoint,
          defina a variável <code>CRON_SECRET</code> e configure o mesmo valor no cabeçalho do cron.
        </p>
      </div>
    </div>
  );
}
