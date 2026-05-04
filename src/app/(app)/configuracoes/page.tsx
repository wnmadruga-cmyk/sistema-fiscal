import Link from "next/link";
import {
  Building2,
  Users,
  Tags,
  Layers,
  BarChart2,
  CheckSquare,
  BookOpen,
  AlertTriangle,
  Inbox,
  Briefcase,
  GitBranch,
  ArrowLeftRight,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const configSections = [
  {
    title: "Escritório",
    description: "Nome, CNPJ e dados do escritório",
    href: "/configuracoes/escritorio",
    icon: Building2,
  },
  {
    title: "Usuários",
    description: "Gerenciar colaboradores e permissões",
    href: "/configuracoes/usuarios",
    icon: Users,
  },
  {
    title: "Escritórios",
    description: "Filiais/escritórios às quais empresas pertencem",
    href: "/configuracoes/filiais",
    icon: Building2,
  },
  {
    title: "Grupos",
    description: "Agrupar empresas por categoria",
    href: "/configuracoes/grupos",
    icon: Layers,
  },
  {
    title: "Etiquetas",
    description: "Tags coloridas para organização",
    href: "/configuracoes/etiquetas",
    icon: Tags,
  },
  {
    title: "Prioridades",
    description: "Níveis de prioridade dos cards",
    href: "/configuracoes/prioridades",
    icon: BarChart2,
  },
  {
    title: "Checklists",
    description: "Templates de checklist por etapa",
    href: "/configuracoes/checklists",
    icon: CheckSquare,
  },
  {
    title: "Etapas do Fluxo",
    description: "Configure nomes, ordem e manuais de cada etapa",
    href: "/configuracoes/etapas",
    icon: BookOpen,
  },
  {
    title: "Erros Possíveis",
    description: "Catálogo de erros vinculáveis a grupos ou empresas",
    href: "/configuracoes/erros",
    icon: AlertTriangle,
  },
  {
    title: "Formas de Chegada",
    description: "Como os documentos chegam (Email, Acesso, ALT...)",
    href: "/configuracoes/formas-chegada",
    icon: Inbox,
  },
  {
    title: "Tipos de Atividade",
    description: "Categorias de atividade econômica (Comércio, Serviços...)",
    href: "/configuracoes/tipos-atividade",
    icon: Briefcase,
  },
  {
    title: "Fluxo Inicial da Competência",
    description: "Define em qual etapa cada competência começa conforme origem das NFs ou grupo",
    href: "/configuracoes/fluxo-inicial",
    icon: GitBranch,
  },
  {
    title: "Transferência de Responsáveis",
    description: "Reatribuir responsáveis de elaboração, busca ou conferência em lote",
    href: "/configuracoes/responsaveis",
    icon: ArrowLeftRight,
  },
  {
    title: "Relatório por E-mail",
    description: "Envio automático diário do andamento da competência",
    href: "/configuracoes/email-notificacao",
    icon: Mail,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as configurações do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {configSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
