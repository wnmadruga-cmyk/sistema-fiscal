# ECM Flow Fiscal

Sistema de Gestão do Fluxo Fiscal Mensal para escritórios de contabilidade.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Backend**: Next.js API Routes
- **Banco**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **UI**: Tailwind CSS + Radix UI
- **Auth**: Supabase Auth
- **Tema**: Dark/Light mode via next-themes

## Funcionalidades

- Cadastro completo de empresas com documentos fiscais e configurações de busca
- Fluxo mensal por etapas: Busca → Conferência → Transmissão → Envio → Concluído
- Visualização tabela (inline) e Kanban (drag & drop)
- Controle de qualidade com registro de erros por etapa
- Comentários com @mentions e notificações
- Observações persistentes entre competências
- Checklists configuráveis por etapa/grupo/empresa
- Dashboard com métricas operacionais
- Tema claro/escuro
- Multi-perfil: Admin, Operacional, Conferente

## Setup

### 1. Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 2. Criar projeto Supabase

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Crie um novo projeto
3. Aguarde o banco inicializar
4. Vá em **Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
5. Vá em **Settings → Database** e copie a connection string:
   - Com pooler (porta 6543) → `DATABASE_URL`
   - Direta (porta 5432) → `DIRECT_URL`

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha o `.env.local` com os valores do Supabase.

Para `ENCRYPTION_SECRET`, gere um valor aleatório de 32 caracteres:
```bash
openssl rand -hex 16
```

### 4. Instalar dependências

```bash
npm install
```

### 5. Criar tabelas no banco

```bash
npx prisma migrate dev --name init
```

### 6. Popular dados iniciais

```bash
npx prisma db seed
```

Isso cria: regimes tributários, tipos de atividade, prioridades, etiquetas e templates de checklist.

### 7. Criar o primeiro usuário (Admin)

No painel do Supabase, vá em **Authentication → Users** e crie um usuário com email/senha.

Depois, no **SQL Editor** do Supabase, execute:

```sql
-- Primeiro, crie um escritório
INSERT INTO escritorios (id, nome, email, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Meu Escritório', 'admin@escritorio.com', now(), now())
RETURNING id;

-- Depois, vincule o usuário Supabase ao escritório (use o ID retornado acima e o ID do usuário Supabase)
INSERT INTO usuarios (id, "supabaseId", "escritorioId", nome, email, perfil, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'ID_DO_USUARIO_SUPABASE',  -- substitua pelo ID do usuário criado
  'ID_DO_ESCRITORIO',         -- substitua pelo ID do escritório criado
  'Administrador',
  'admin@escritorio.com',
  'ADMIN',
  now(),
  now()
);
```

### 8. Iniciar o servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login.

## Fluxo de uso

### 1. Configurações iniciais
- `/configuracoes` → Configure o escritório, grupos, etiquetas, prioridades
- `/configuracoes/usuarios` → Adicione colaboradores

### 2. Cadastrar empresas
- `/empresas/nova` → Cadastre cada empresa cliente com regime tributário, responsáveis e configurações

### 3. Gerar competências
- Na lista de empresas, clique no ícone de calendário para gerar a competência do mês atual
- Ou acesse diretamente `/competencias`

### 4. Trabalhar o fluxo
- `/competencias` → Visão geral em tabela ou kanban
- Clique em uma empresa para abrir o card e trabalhar as etapas

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/login       # Página de login
│   ├── (app)/             # Páginas autenticadas
│   │   ├── dashboard/
│   │   ├── competencias/
│   │   ├── empresas/
│   │   ├── qualidade/
│   │   └── configuracoes/
│   └── api/               # API Routes
├── components/
│   ├── ui/                # Componentes base (Radix UI)
│   ├── layout/            # Sidebar, Header
│   ├── dashboard/
│   ├── empresas/
│   ├── competencias/
│   ├── qualidade/
│   └── shared/
├── lib/
│   ├── prisma.ts
│   ├── supabase/
│   ├── auth.ts
│   ├── crypto.ts          # Criptografia de senhas de busca
│   └── competencia-utils.ts
├── store/                 # Zustand stores
└── types/
prisma/
├── schema.prisma
└── seed.ts
```

## Scripts disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run start        # Produção
npx prisma studio    # Interface visual do banco
npx prisma migrate dev   # Rodar migrations
npx prisma db seed   # Popular dados iniciais
```

## Deploy

### Vercel (recomendado)

1. Faça fork do repositório
2. Conecte ao Vercel
3. Configure as variáveis de ambiente no painel do Vercel
4. Deploy!

O Supabase já inclui hosting do banco — não é necessário configurar um banco separado.

## Segurança

- Senhas de portais de busca são criptografadas com AES-256-GCM antes de salvar no banco
- Autenticação gerenciada pelo Supabase
- Middleware protege todas as rotas autenticadas
- Row-level security pode ser configurada no Supabase para isolamento adicional

## Próximos passos (roadmap)

- [ ] Integração com API de IA para análise de produtividade
- [ ] Upload de arquivos via Supabase Storage
- [ ] Notificações em tempo real via Supabase Realtime
- [ ] Relatórios exportáveis (PDF/Excel)
- [ ] App mobile (React Native)
- [ ] Webhooks para integração com Digisac
- [ ] Automação de busca de documentos

---

**ECM Flow Fiscal** — Desenvolvido para escritórios de contabilidade de alta performance.
