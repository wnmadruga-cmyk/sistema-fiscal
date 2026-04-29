"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { CardItem } from "./CompetenciasPageContent";

const TIPO_DOC_LABEL: Record<string, string> = {
  NFE: "NF-e",
  NFCE: "NFC-e",
  NOTA_SERVICO: "Nota de Serviço",
  CTE: "CT-e",
  RECIBO_ALUGUEL: "Recibo de Aluguel",
};

type FullEmpresa = {
  id: string;
  codigoInterno: string | null;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  cpf: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  email: string | null;
  telefone: string | null;
  diaVencimentoHonorarios: number | null;
  situacaoFolha: string;
  fatorR: boolean;
  fechaAutomatico: boolean;
  entregaImpressa: boolean;
  clienteBusca: boolean;
  escritorioEntrega: boolean;
  entregaDigisac: boolean;
  semMovimentoTemp: boolean;
  exigirAbrirCard: boolean;
  observacaoGeral: string | null;
  ativa: boolean;
  regimeTributario: { codigo: string; nome: string } | null;
  tipoAtividade: { nome: string } | null;
  prioridade: { nome: string; cor: string } | null;
  respBusca: { nome: string } | null;
  respElaboracao: { nome: string } | null;
  respConferencia: { nome: string } | null;
  grupos: { grupo: { id: string; nome: string } }[];
  etiquetas: { etiqueta: { id: string; nome: string; cor: string } }[];
  configDocumentos: Array<{
    id: string;
    tipoDocumento: string;
    ativo: boolean;
    origem: string;
    nomeSistema: string | null;
    formaChegada: string | null;
    formaChegadaConfig: { id: string; nome: string } | null;
    urlAcesso: string | null;
    loginAcesso: string | null;
    senhaAcesso: string | null;
    tipoPortal: string | null;
    urlPortal: string | null;
    loginPortal: string | null;
    senhaPortal: string | null;
    observacao: string | null;
  }>;
  configBuscas: Array<{
    id: string;
    nome: string;
    url: string;
    login: string;
    senhaHash: string;
    observacao: string | null;
    ativo: boolean;
  }>;
};

export function EmpresaInfoModal({
  card,
  open,
  onOpenChange,
}: {
  card: CardItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [data, setData] = useState<FullEmpresa | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !card) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/empresas/${card.empresa.id}`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? j))
      .catch(() => toast.error("Erro ao carregar empresa"))
      .finally(() => setLoading(false));
  }, [open, card]);

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {card.empresa.codigoInterno && (
              <span className="text-muted-foreground font-mono text-sm">{card.empresa.codigoInterno}</span>
            )}
            <span>{card.empresa.razaoSocial}</span>
          </DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : (
          <Tabs defaultValue="identificacao" className="mt-2">
            <TabsList className="flex w-full justify-start flex-wrap h-auto gap-1">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
              <TabsTrigger value="operacional">Operacional</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="buscas">Portais</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Código interno">{data.codigoInterno ?? "—"}</Field>
                <Field label="Status">
                  <Badge variant={data.ativa ? "default" : "secondary"}>{data.ativa ? "Ativa" : "Inativa"}</Badge>
                </Field>
                <Field label="Razão Social">{data.razaoSocial}</Field>
                <Field label="CNPJ">{data.cnpj ?? "—"}</Field>
                <Field label="CPF">{data.cpf ?? "—"}</Field>
                <Field label="Inscr. Estadual">{data.inscricaoEstadual ?? "—"}</Field>
                <Field label="Inscr. Municipal">{data.inscricaoMunicipal ?? "—"}</Field>
                <Field label="E-mail">{data.email ?? "—"}</Field>
                <Field label="Telefone">{data.telefone ?? "—"}</Field>
                <Field label="Regime">
                  {data.regimeTributario ? (
                    <Badge variant="secondary">{data.regimeTributario.codigo} — {data.regimeTributario.nome}</Badge>
                  ) : "—"}
                </Field>
                <Field label="Tipo Atividade">{data.tipoAtividade?.nome ?? "—"}</Field>
                <Field label="Prioridade">
                  {data.prioridade ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: data.prioridade.cor }} />
                      {data.prioridade.nome}
                    </span>
                  ) : "—"}
                </Field>
                <Field label="Grupos">
                  {data.grupos.length === 0 ? "—" : (
                    <div className="flex flex-wrap gap-1">
                      {data.grupos.map((g) => (
                        <span key={g.grupo.id} className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {g.grupo.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              {data.etiquetas.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Etiquetas</p>
                  <div className="flex flex-wrap gap-1">
                    {data.etiquetas.map((et) => (
                      <span key={et.etiqueta.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${et.etiqueta.cor}20`, color: et.etiqueta.cor }}>
                        {et.etiqueta.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.observacaoGeral && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Observação geral</p>
                  <p className="text-sm whitespace-pre-wrap">{data.observacaoGeral}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="responsaveis" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Resp. Busca">{data.respBusca?.nome ?? "—"}</Field>
                <Field label="Resp. Elaboração">{data.respElaboracao?.nome ?? "—"}</Field>
                <Field label="Resp. Conferência">{data.respConferencia?.nome ?? "—"}</Field>
              </div>
            </TabsContent>

            <TabsContent value="operacional" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Folha">{data.situacaoFolha === "NAO_TEM" ? "Não tem" : data.situacaoFolha}</Field>
                <Field label="Dia venc. honorários">{data.diaVencimentoHonorarios ?? "—"}</Field>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Flag label="Fator R" v={data.fatorR} />
                <Flag label="Fecha automático" v={data.fechaAutomatico} />
                <Flag label="Cliente busca" v={data.clienteBusca} />
                <Flag label="Escritório entrega" v={data.escritorioEntrega} />
                <Flag label="Entrega impressa" v={data.entregaImpressa} />
                <Flag label="Entrega Digisac" v={data.entregaDigisac} />
                <Flag label="Sem mov. temp." v={data.semMovimentoTemp} />
                <Flag label="Exigir abrir card" v={data.exigirAbrirCard} />
              </div>
            </TabsContent>

            <TabsContent value="documentos" className="space-y-3 mt-3">
              {data.configDocumentos.filter((d) => d.ativo).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum documento ativo.</p>
              ) : (
                data.configDocumentos.filter((d) => d.ativo).map((d) => (
                  <div key={d.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{TIPO_DOC_LABEL[d.tipoDocumento] ?? d.tipoDocumento}</p>
                      <Badge variant="secondary" className="text-[10px]">{d.origem}</Badge>
                      {d.formaChegadaConfig && (
                        <Badge variant="secondary" className="text-[10px]">Chega via: {d.formaChegadaConfig.nome}</Badge>
                      )}
                    </div>
                    {d.origem === "TERCEIROS" && d.nomeSistema && <Field label="Sistema">{d.nomeSistema}</Field>}
                    {(d.urlAcesso || d.loginAcesso || d.senhaAcesso) && (
                      <div className="border rounded p-2 space-y-1.5 bg-muted/30">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Acesso ao sistema</p>
                        <UrlField label="URL" value={d.urlAcesso} />
                        <CopyField label="Login" value={d.loginAcesso} />
                        <SecretField label="Senha" value={d.senhaAcesso} />
                      </div>
                    )}
                    {(d.urlPortal || d.loginPortal || d.senhaPortal) && (
                      <div className="border rounded p-2 space-y-1.5 bg-muted/30">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Portal {d.tipoPortal ?? ""}
                        </p>
                        <UrlField label="URL" value={d.urlPortal} />
                        <CopyField label="Login" value={d.loginPortal} />
                        <SecretField label="Senha" value={d.senhaPortal} />
                      </div>
                    )}
                    {d.observacao && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.observacao}</p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="buscas" className="space-y-3 mt-3">
              {data.configBuscas.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum portal de busca configurado.</p>
              ) : (
                data.configBuscas.map((b) => (
                  <div key={b.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{b.nome}</p>
                      <Badge variant={b.ativo ? "default" : "secondary"} className="text-[10px]">
                        {b.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <UrlField label="URL" value={b.url} />
                    <CopyField label="Login" value={b.login} />
                    <SecretField label="Senha" value={b.senhaHash} />
                    {b.observacao && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{b.observacao}</p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm break-words">{children}</div>
    </div>
  );
}

function Flag({ label, v }: { label: string; v: boolean }) {
  return (
    <div className="flex items-center justify-between border rounded px-2 py-1">
      <span>{label}</span>
      <span className={v ? "text-emerald-600 font-medium" : "text-muted-foreground"}>{v ? "Sim" : "Não"}</span>
    </div>
  );
}

function copyText(v: string | null) {
  if (!v) return;
  navigator.clipboard.writeText(v);
  toast.success("Copiado");
}

function CopyField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}:</span>
      <code className="flex-1 truncate font-mono text-xs">{value}</code>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(value)}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function UrlField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}:</span>
      <a href={value} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline text-xs">
        {value}
      </a>
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
        <ExternalLink className="h-3 w-3" />
      </a>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(value)}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function SecretField({ label, value }: { label: string; value: string | null }) {
  const [show, setShow] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}:</span>
      <code className="flex-1 truncate font-mono text-xs">{show ? value : "••••••••"}</code>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(value)}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
