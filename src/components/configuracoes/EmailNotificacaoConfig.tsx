"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Plus, Trash2, Send, Clock, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Config {
  ativo: boolean;
  horaEnvio: string;
  destinatarios: string[];
  assunto: string;
  ultimoEnvio: string | null;
}

export function EmailNotificacaoConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<Config>({
    queryKey: ["email-config"],
    queryFn: async () => {
      const res = await fetch("/api/email-config");
      const json = await res.json();
      return json.data;
    },
  });

  const [ativo, setAtivo] = useState(false);
  const [horaEnvio, setHoraEnvio] = useState("08:00");
  const [assunto, setAssunto] = useState("Relatório Diário — Fluxo Fiscal");
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setHoraEnvio(config.horaEnvio);
      setAssunto(config.assunto);
      setDestinatarios(config.destinatarios ?? []);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Config>) => {
      const res = await fetch("/api/email-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-config"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  function handleSave() {
    saveMutation.mutate({ ativo, horaEnvio, assunto, destinatarios });
  }

  function addEmail() {
    const email = novoEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("E-mail inválido");
      return;
    }
    if (destinatarios.includes(email)) {
      toast.error("E-mail já adicionado");
      return;
    }
    setDestinatarios((prev) => [...prev, email]);
    setNovoEmail("");
  }

  function removeEmail(email: string) {
    setDestinatarios((prev) => prev.filter((e) => e !== email));
  }

  async function forceSend() {
    if (destinatarios.length === 0) {
      toast.error("Adicione ao menos um destinatário");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/email/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinatarios }),
      });
      const json = await res.json();
      if (json.data?.enviado) {
        toast.success(`E-mail enviado para ${destinatarios.length} destinatário(s)!`);
        queryClient.invalidateQueries({ queryKey: ["email-config"] });
      } else {
        toast.info(json.data?.motivo ?? "E-mail não enviado");
      }
    } catch {
      toast.error("Erro ao enviar e-mail");
    } finally {
      setEnviando(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-48" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">Relatório Diário por E-mail</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Envio automático até que a competência atinja 100% de conclusão
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={ativo}
            onCheckedChange={setAtivo}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Horário de envio */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Horário de envio (Horário de Brasília)
          </label>
          <Input
            type="time"
            value={horaEnvio}
            onChange={(e) => setHoraEnvio(e.target.value)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            O sistema verifica a cada hora se está no horário configurado.
          </p>
        </div>

        {/* Assunto */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Assunto do e-mail</label>
          <Input
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Relatório Diário — Fluxo Fiscal"
          />
        </div>

        {/* Destinatários */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Destinatários</label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={addEmail} type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {destinatarios.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {destinatarios.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1.5 pr-1">
                  {email}
                  <button
                    onClick={() => removeEmail(email)}
                    className="hover:text-destructive transition-colors ml-0.5"
                    type="button"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Nenhum destinatário. Adicione e-mails acima.</p>
          )}
        </div>

        {/* Último envio */}
        {config?.ultimoEnvio && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Último envio: {formatDate(new Date(config.ultimoEnvio))}
          </div>
        )}

        {/* O e-mail vai conter */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">O relatório incluirá:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
            <li>Total de empresas, concluídas, pendentes e % de conclusão</li>
            <li>Barra de progresso visual</li>
            <li>Alertas de urgentes e atrasadas</li>
            <li>Status por escritório/filial</li>
            <li>Produtividade por responsável de elaboração</li>
          </ul>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
          <Button
            variant="outline"
            onClick={forceSend}
            disabled={enviando || destinatarios.length === 0}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {enviando ? "Enviando..." : "Forçar envio agora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
