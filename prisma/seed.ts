import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // Regimes tributários
  const regimes = [
    { nome: "Simples Nacional", codigo: "SN", descricao: "Regime simplificado para MPEs" },
    { nome: "Lucro Presumido", codigo: "LP", descricao: "Tributação com base em percentuais" },
    { nome: "Lucro Real", codigo: "LR", descricao: "Tributação sobre lucro efetivo" },
    { nome: "Lucro Arbitrado", codigo: "LA", descricao: "Aplicado por autoridade fiscal" },
    { nome: "MEI", codigo: "MEI", descricao: "Microempreendedor Individual" },
    { nome: "Imune/Isento", codigo: "II", descricao: "Entidades imunes ou isentas" },
  ];

  for (const regime of regimes) {
    await prisma.regimeTributario.upsert({
      where: { codigo: regime.codigo },
      update: {},
      create: regime,
    });
  }

  // Tipos de atividade
  const tipos = [
    { nome: "Comércio", descricao: "Atividade comercial" },
    { nome: "Indústria", descricao: "Atividade industrial" },
    { nome: "Serviços", descricao: "Prestação de serviços" },
    { nome: "Transporte", descricao: "Transporte de cargas ou passageiros" },
    { nome: "Construção Civil", descricao: "Construção e reformas" },
    { nome: "Agropecuária", descricao: "Atividade rural" },
    { nome: "Misto", descricao: "Mais de uma atividade" },
  ];

  for (const tipo of tipos) {
    await prisma.tipoAtividade.upsert({
      where: { nome: tipo.nome },
      update: {},
      create: tipo,
    });
  }

  // Prioridades
  const prioridades = [
    { nome: "Baixa", nivel: 1, cor: "#64748b" },
    { nome: "Normal", nivel: 2, cor: "#3b82f6" },
    { nome: "Alta", nivel: 3, cor: "#f59e0b" },
    { nome: "Urgente", nivel: 4, cor: "#ef4444" },
  ];

  for (const prioridade of prioridades) {
    await prisma.prioridade.create({ data: prioridade }).catch(() => {});
  }

  // Etiquetas padrão
  const etiquetas = [
    { nome: "MEI", cor: "#8b5cf6" },
    { nome: "Novo", cor: "#10b981" },
    { nome: "Atenção", cor: "#f59e0b" },
    { nome: "Revisão", cor: "#3b82f6" },
    { nome: "Bloqueado", cor: "#ef4444" },
  ];

  for (const etiqueta of etiquetas) {
    await prisma.etiqueta.create({ data: etiqueta }).catch(() => {});
  }

  // Checklists padrão para etapa BUSCA_DOCUMENTOS
  const templateBusca = await prisma.checklistTemplate.create({
    data: {
      etapa: "BUSCA_DOCUMENTOS",
      escopo: "GLOBAL",
      nome: "Checklist Padrão - Busca de Documentos",
      obrigatorio: true,
      itens: {
        create: [
          { texto: "Processou notas de entrada", ordem: 1, obrigatorio: true },
          { texto: "Processou notas de saída", ordem: 2, obrigatorio: true },
          { texto: "Conferiu numeração das notas", ordem: 3, obrigatorio: true },
          { texto: "Verificou notas canceladas", ordem: 4, obrigatorio: false },
        ],
      },
    },
  });

  // Checklist para CONFERENCIA_APURACAO
  const templateConferencia = await prisma.checklistTemplate.create({
    data: {
      etapa: "CONFERENCIA_APURACAO",
      escopo: "GLOBAL",
      nome: "Checklist Padrão - Conferência e Apuração",
      obrigatorio: true,
      itens: {
        create: [
          { texto: "Conferiu lançamentos de entrada", ordem: 1, obrigatorio: true },
          { texto: "Conferiu lançamentos de saída", ordem: 2, obrigatorio: true },
          { texto: "Apurou impostos", ordem: 3, obrigatorio: true },
          { texto: "Conferiu alíquotas", ordem: 4, obrigatorio: true },
          { texto: "Validou créditos/débitos", ordem: 5, obrigatorio: false },
        ],
      },
    },
  });

  // Checklist para TRANSMISSAO
  const templateTransmissao = await prisma.checklistTemplate.create({
    data: {
      etapa: "TRANSMISSAO",
      escopo: "GLOBAL",
      nome: "Checklist Padrão - Transmissão",
      obrigatorio: true,
      itens: {
        create: [
          { texto: "Emitiu guias de pagamento", ordem: 1, obrigatorio: true },
          { texto: "Transmitiu PGDAS (Simples Nacional)", ordem: 2, obrigatorio: false },
          { texto: "Transmitiu SPED Fiscal", ordem: 3, obrigatorio: false },
          { texto: "Verificou pendências na malha fiscal", ordem: 4, obrigatorio: false },
        ],
      },
    },
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log(`   - ${regimes.length} regimes tributários`);
  console.log(`   - ${tipos.length} tipos de atividade`);
  console.log(`   - ${prioridades.length} prioridades`);
  console.log(`   - ${etiquetas.length} etiquetas padrão`);
  console.log(`   - 3 templates de checklist`);
  console.log("");
  console.log("📋 Próximos passos:");
  console.log("   1. Crie seu escritório no Supabase Auth");
  console.log("   2. Faça o primeiro login e configure o escritório em /configuracoes");
  console.log("   3. Cadastre suas empresas em /empresas");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
