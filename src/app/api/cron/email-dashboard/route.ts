import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildDashboardEmail } from "@/lib/email-dashboard-template";
import { collectDashboardData } from "@/app/api/email/dashboard/route";
import { NextResponse } from "next/server";

// Verifica se o horário atual (Brasília = UTC-3) bate com horaEnvio
function isHoraEnvio(horaEnvio: string): boolean {
  const agora = new Date();
  const brasiliaOffset = -3 * 60; // minutos
  const localOffset = agora.getTimezoneOffset(); // minutos
  const brasiliaTime = new Date(agora.getTime() + (localOffset + brasiliaOffset) * 60 * 1000);

  const [hConf, mConf] = horaEnvio.split(":").map(Number);
  return brasiliaTime.getHours() === hConf && brasiliaTime.getMinutes() < 60;
}

function jafezHoje(ultimoEnvio: Date | null): boolean {
  if (!ultimoEnvio) return false;
  const hoje = new Date();
  return (
    ultimoEnvio.getFullYear() === hoje.getFullYear() &&
    ultimoEnvio.getMonth() === hoje.getMonth() &&
    ultimoEnvio.getDate() === hoje.getDate()
  );
}

export async function GET(request: Request) {
  // Protege o endpoint com CRON_SECRET
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.configEmailNotificacao.findMany({
      where: { ativo: true, destinatarios: { isEmpty: false } },
    });

    const resultados: Array<{ escritorioId: string; enviado: boolean; motivo?: string }> = [];

    for (const config of configs) {
      if (jafezHoje(config.ultimoEnvio)) {
        resultados.push({ escritorioId: config.escritorioId, enviado: false, motivo: "já enviado hoje" });
        continue;
      }

      if (!isHoraEnvio(config.horaEnvio)) {
        resultados.push({ escritorioId: config.escritorioId, enviado: false, motivo: "fora do horário" });
        continue;
      }

      const data = await collectDashboardData(config.escritorioId);

      if (data.pct === 100) {
        resultados.push({ escritorioId: config.escritorioId, enviado: false, motivo: "100% concluído" });
        continue;
      }

      const html = buildDashboardEmail(data);
      await sendEmail({ to: config.destinatarios, subject: config.assunto, html });

      await prisma.configEmailNotificacao.update({
        where: { id: config.id },
        data: { ultimoEnvio: new Date() },
      });

      resultados.push({ escritorioId: config.escritorioId, enviado: true });
    }

    return NextResponse.json({ ok: true, resultados });
  } catch (error) {
    console.error("Cron email-dashboard error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
