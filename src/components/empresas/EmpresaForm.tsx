"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X, Plus } from "lucide-react";
import type {
  RegimeTributario,
  TipoAtividade,
  Prioridade,
  Grupo,
  Etiqueta,
  Empresa,
  ConfigDocumento,
} from "@prisma/client";

type DocTipo = "NFE" | "NFCE" | "NOTA_SERVICO" | "CTE" | "RECIBO_ALUGUEL";
const DOC_LABEL: Record<DocTipo, string> = {
  NFE: "NF-e (55)",
  NFCE: "NFC-e (65)",
  NOTA_SERVICO: "Nota de Serviço",
  CTE: "CT-e",
  RECIBO_ALUGUEL: "Recibo de Aluguel",
};
const DOC_TIPOS: DocTipo[] = ["NFE", "NFCE", "NOTA_SERVICO", "CTE", "RECIBO_ALUGUEL"];

interface DocState {
  tipoDocumento: DocTipo;
  ativo: boolean;
  origem: "ESCRITORIO" | "TERCEIROS";
  nomeSistema: string;
  formaChegadaId: string;
  urlAcesso: string;
  loginAcesso: string;
  senhaAcesso: string;
  tipoPortal: "NACIONAL" | "MUNICIPAL" | "";
  urlPortal: string;
  loginPortal: string;
  senhaPortal: string;
  observacao: string;
}

interface FormaChegada { id: string; nome: string }

interface ChecklistOpt { id: string; nome: string; etapa: string; escopo: string }

interface ErroOpt {
  id: string;
  nome: string;
  categorias: string[];
  peso: number;
  pesosCategoria: Record<string, number>;
}

interface EmpresaFormProps {
  empresa?: Partial<Empresa> & {
    grupoIds?: string[];
    etiquetaIds?: string[];
    checklistTemplateIds?: string[];
    checklistExcluidosIds?: string[];
    erroPossivelIds?: string[];
  };
  regimes: RegimeTributario[];
  tipos: TipoAtividade[];
  prioridades: Prioridade[];
  filiais: { id: string; nome: string }[];
  grupos: Grupo[];
  etiquetas?: Etiqueta[];
  usuarios: { id: string; nome: string; avatar: string | null }[];
  configDocumentos?: ConfigDocumento[];
  formasChegada?: FormaChegada[];
  checklists?: ChecklistOpt[];
  erros?: ErroOpt[];
  canDelete?: boolean;
  onSuccess?: () => void;
}

function buildInitialDocs(existing: ConfigDocumento[] = []): Record<DocTipo, DocState> {
  const map: Record<DocTipo, DocState> = {} as Record<DocTipo, DocState>;
  for (const t of DOC_TIPOS) {
    const e = existing.find((d) => d.tipoDocumento === t);
    map[t] = {
      tipoDocumento: t,
      ativo: e?.ativo ?? false,
      origem: (e?.origem as "ESCRITORIO" | "TERCEIROS") ?? "ESCRITORIO",
      nomeSistema: e?.nomeSistema ?? "",
      formaChegadaId: e?.formaChegadaId ?? "",
      urlAcesso: e?.urlAcesso ?? "",
      loginAcesso: e?.loginAcesso ?? "",
      senhaAcesso: e?.senhaAcesso ?? "",
      tipoPortal: (e?.tipoPortal as DocState["tipoPortal"]) ?? "",
      urlPortal: e?.urlPortal ?? "",
      loginPortal: e?.loginPortal ?? "",
      senhaPortal: e?.senhaPortal ?? "",
      observacao: e?.observacao ?? "",
    };
  }
  return map;
}

export function EmpresaForm({
  empresa,
  regimes,
  tipos,
  prioridades,
  filiais,
  grupos,
  etiquetas = [],
  usuarios,
  configDocumentos = [],
  formasChegada = [],
  checklists = [],
  erros = [],
  canDelete = false,
  onSuccess,
}: EmpresaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    codigoInterno: empresa?.codigoInterno ?? "",
    razaoSocial: empresa?.razaoSocial ?? "",
    cnpj: empresa?.cnpj ?? "",
    cpf: empresa?.cpf ?? "",
    email: empresa?.email ?? "",
    telefone: empresa?.telefone ?? "",
    regimeTributarioId: empresa?.regimeTributarioId ?? "",
    tipoAtividadeId: empresa?.tipoAtividadeId ?? "",
    prioridadeId: empresa?.prioridadeId ?? "",
    filialId: empresa?.filialId ?? "",
    respBuscaId: empresa?.respBuscaId ?? "",
    respElaboracaoId: empresa?.respElaboracaoId ?? "",
    respConferenciaId: empresa?.respConferenciaId ?? "",
    diaVencimentoHonorarios: empresa?.diaVencimentoHonorarios?.toString() ?? "",
    situacaoFolha: empresa?.situacaoFolha ?? "NAO_TEM",
    fatorR: empresa?.fatorR ?? false,
    fechaAutomatico: empresa?.fechaAutomatico ?? false,
    entregaImpressa: empresa?.entregaImpressa ?? false,
    clienteBusca: empresa?.clienteBusca ?? false,
    escritorioEntrega: empresa?.escritorioEntrega ?? false,
    entregaDigisac: empresa?.entregaDigisac ?? false,
    semMovimentoTemp: empresa?.semMovimentoTemp ?? false,
    exigirAbrirCard: empresa?.exigirAbrirCard ?? false,
    exigirConferencia: empresa?.exigirConferencia ?? false,
    observacaoGeral: empresa?.observacaoGeral ?? "",
    grupoIds: empresa?.grupoIds ?? [],
    etiquetaIds: empresa?.etiquetaIds ?? [],
    checklistTemplateIds: empresa?.checklistTemplateIds ?? [],
    checklistExcluidosIds: empresa?.checklistExcluidosIds ?? [],
    erroPossivelIds: empresa?.erroPossivelIds ?? [],
  });

  const [docs, setDocs] = useState<Record<DocTipo, DocState>>(() => buildInitialDocs(configDocumentos));
  const [acessoOpen, setAcessoOpen] = useState<Set<DocTipo>>(() => {
    const s = new Set<DocTipo>();
    for (const t of DOC_TIPOS) {
      const e = configDocumentos.find((c) => c.tipoDocumento === t);
      if (e?.urlAcesso || e?.loginAcesso || e?.senhaAcesso) s.add(t);
    }
    return s;
  });
  function toggleAcesso(t: DocTipo, v: boolean) {
    setAcessoOpen((prev) => {
      const n = new Set(prev);
      if (v) n.add(t); else n.delete(t);
      return n;
    });
    if (!v) setDoc(t, { urlAcesso: "", loginAcesso: "", senhaAcesso: "" });
  }

  function set(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setDoc(t: DocTipo, patch: Partial<DocState>) {
    setDocs((prev) => ({ ...prev, [t]: { ...prev[t], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      diaVencimentoHonorarios: form.diaVencimentoHonorarios ? parseInt(form.diaVencimentoHonorarios) : undefined,
      regimeTributarioId: form.regimeTributarioId || undefined,
      tipoAtividadeId: form.tipoAtividadeId || undefined,
      prioridadeId: form.prioridadeId || undefined,
      filialId: form.filialId || undefined,
      respBuscaId: form.respBuscaId || undefined,
      respElaboracaoId: form.respElaboracaoId || undefined,
      respConferenciaId: form.respConferenciaId || undefined,
    };

    const isEdit = !!empresa?.id;
    const url = isEdit ? `/api/empresas/${empresa.id}` : "/api/empresas";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      toast.error(data.error ?? "Erro ao salvar empresa");
      return;
    }

    const empresaId = isEdit ? empresa!.id! : data.id;

    const docsPayload = DOC_TIPOS.map((t) => {
      const d = docs[t];
      return {
        tipoDocumento: t,
        ativo: d.ativo,
        origem: d.origem,
        nomeSistema: d.nomeSistema || null,
        formaChegadaId: d.formaChegadaId || null,
        urlAcesso: d.urlAcesso || null,
        loginAcesso: d.loginAcesso || null,
        senhaAcesso: d.senhaAcesso || null,
        tipoPortal: d.tipoPortal || null,
        urlPortal: d.urlPortal || null,
        loginPortal: d.loginPortal || null,
        senhaPortal: d.senhaPortal || null,
        observacao: d.observacao || null,
      };
    });

    const docsRes = await fetch(`/api/empresas/${empresaId}/config-documentos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentos: docsPayload }),
    });
    setLoading(false);
    if (!docsRes.ok) {
      const d = await docsRes.json();
      toast.error(`Empresa salva, mas erro nos docs: ${d.error ?? ""}`);
      return;
    }

    toast.success(isEdit ? "Empresa atualizada!" : "Empresa cadastrada!");
    if (onSuccess) {
      onSuccess();
    } else if (!isEdit) {
      router.push(`/empresas/${empresaId}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  const SwitchField = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <div className="flex items-center justify-between">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={form[field] as boolean} onCheckedChange={(v) => set(field, v)} />
    </div>
  );

  async function toggleAtiva() {
    if (!empresa?.id) return;
    const novoEstado = !(empresa.ativa ?? true);
    const acao = novoEstado ? "reativar" : "inativar";
    if (!confirm(`Tem certeza que deseja ${acao} esta empresa?`)) return;
    const res = await fetch(`/api/empresas/${empresa.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: novoEstado }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? `Erro ao ${acao} empresa`);
      return;
    }
    toast.success(`Empresa ${novoEstado ? "reativada" : "inativada"}!`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {empresa?.id && (
        <div className="mb-4 flex items-center justify-between border rounded-md p-3 bg-muted/30">
          <div className="text-sm">
            Status: <strong>{empresa.ativa === false ? "Inativa" : "Ativa"}</strong>
          </div>
          {canDelete && (
            <Button type="button" variant={empresa.ativa === false ? "default" : "destructive"} size="sm" onClick={toggleAtiva}>
              {empresa.ativa === false ? "Reativar empresa" : "Inativar empresa"}
            </Button>
          )}
        </div>
      )}
      <Tabs defaultValue="identificacao">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="identificacao">Identificação</TabsTrigger>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="entrega">Entrega</TabsTrigger>
          <TabsTrigger value="documentos">Documentos Fiscais</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
          <TabsTrigger value="erros">Erros</TabsTrigger>
        </TabsList>

        {/* Identificação */}
        <TabsContent value="identificacao">
          <Card>
            <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Código Interno</Label>
                  <Input value={form.codigoInterno} onChange={(e) => set("codigoInterno", e.target.value)} placeholder="Ex: 001" />
                </div>
                <div className="space-y-1">
                  <Label>Razão Social *</Label>
                  <Input required value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>CNPJ / CPF</Label>
                <Input
                  value={form.cnpj || form.cpf}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 11) set("cpf", v);
                    else set("cnpj", v);
                  }}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Regime Tributário</Label>
                  <Select value={form.regimeTributarioId} onValueChange={(v) => set("regimeTributarioId", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {regimes.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tipo de Atividade</Label>
                  <Select value={form.tipoAtividadeId} onValueChange={(v) => set("tipoAtividadeId", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Prioridade</Label>
                  <Select value={form.prioridadeId} onValueChange={(v) => set("prioridadeId", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {prioridades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Escritório</Label>
                <Select
                  value={form.filialId || "__none__"}
                  onValueChange={(v) => set("filialId", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Grupos</Label>
                <div className="flex flex-wrap gap-2 border rounded-md p-3 min-h-[42px]">
                  {grupos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum grupo cadastrado</span>}
                  {grupos.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        const ids = form.grupoIds.includes(g.id) ? form.grupoIds.filter((id) => id !== g.id) : [...form.grupoIds, g.id];
                        set("grupoIds", ids);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        form.grupoIds.includes(g.id) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {g.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Etiquetas</Label>
                <div className="flex flex-wrap gap-2 border rounded-md p-3 min-h-[42px]">
                  {etiquetas.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada</span>}
                  {etiquetas.map((et) => {
                    const active = form.etiquetaIds.includes(et.id);
                    return (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() => {
                          const ids = active ? form.etiquetaIds.filter((id) => id !== et.id) : [...form.etiquetaIds, et.id];
                          set("etiquetaIds", ids);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                        style={active
                          ? { background: et.cor ?? "#3b82f6", color: "#fff" }
                          : { background: "transparent", border: `1px solid ${et.cor ?? "#3b82f6"}`, color: et.cor ?? "#3b82f6" }}
                      >
                        {et.nome}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observação Geral</Label>
                <Textarea value={form.observacaoGeral} onChange={(e) => set("observacaoGeral", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responsáveis */}
        <TabsContent value="responsaveis">
          <Card>
            <CardHeader><CardTitle>Responsáveis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Responsável pela Busca", field: "respBuscaId" },
                { label: "Responsável pela Elaboração/Entrega", field: "respElaboracaoId" },
                { label: "Responsável pela Conferência", field: "respConferenciaId" },
              ].map(({ label, field }) => (
                <div key={field} className="space-y-1">
                  <Label>{label}</Label>
                  <Select value={form[field as keyof typeof form] as string} onValueChange={(v) => set(field, v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um responsável..." /></SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operacional */}
        <TabsContent value="operacional">
          <Card>
            <CardHeader><CardTitle>Configurações Operacionais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Dia Vencimento Honorários</Label>
                  <Input type="number" min={1} max={31} value={form.diaVencimentoHonorarios} onChange={(e) => set("diaVencimentoHonorarios", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Situação da Folha</Label>
                  <Select value={form.situacaoFolha} onValueChange={(v) => set("situacaoFolha", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NAO_TEM">Não tem</SelectItem>
                      <SelectItem value="RH">RH</SelectItem>
                      <SelectItem value="FISCAL">Fiscal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 border rounded-lg p-4">
                <SwitchField label="Fator R" field="fatorR" />
                <SwitchField label="Fecha Automático" field="fechaAutomatico" />
                <SwitchField label="Sem Movimento Temporário" field="semMovimentoTemp" />
                <SwitchField label="Exigir abrir card (bloquear ações inline)" field="exigirAbrirCard" />
                <SwitchField label="Exigir conferência (registra qualidade auto.)" field="exigirConferencia" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entrega */}
        <TabsContent value="entrega">
          <Card>
            <CardHeader><CardTitle>Configurações de Entrega</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 border rounded-lg p-4">
                <SwitchField label="Entrega Impressa" field="entregaImpressa" />
                {form.entregaImpressa && (
                  <div className="pl-4 space-y-3 border-l-2 border-muted">
                    <SwitchField label="Cliente Busca" field="clienteBusca" />
                    <SwitchField label="Escritório Entrega" field="escritorioEntrega" />
                  </div>
                )}
                <SwitchField label="Entrega via Digisac" field="entregaDigisac" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos Fiscais */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Fiscais</CardTitle>
              <p className="text-sm text-muted-foreground">Configure quais documentos esta empresa emite e como chegam</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {DOC_TIPOS.map((t) => {
                const d = docs[t];
                const isNS = t === "NOTA_SERVICO";
                const isTerceiros = d.origem === "TERCEIROS";
                const temAcesso = acessoOpen.has(t);
                return (
                  <div key={t} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{DOC_LABEL[t]}</div>
                      <Switch checked={d.ativo} onCheckedChange={(v) => setDoc(t, { ativo: v })} />
                    </div>

                    {d.ativo && (
                      <div className="space-y-3 pt-2 border-t">
                        {isNS ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label>Tipo de Portal</Label>
                              <Select value={d.tipoPortal} onValueChange={(v) => setDoc(t, { tipoPortal: v as DocState["tipoPortal"] })}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NACIONAL">Portal Nacional</SelectItem>
                                  <SelectItem value="MUNICIPAL">Portal Prefeitura</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {d.tipoPortal === "MUNICIPAL" && (
                              <div className="space-y-3 border rounded p-3 bg-muted/30">
                                <p className="text-xs font-medium text-muted-foreground">Acesso ao portal da prefeitura</p>
                                <div className="space-y-1">
                                  <Label>URL do portal</Label>
                                  <Input value={d.urlPortal} onChange={(e) => setDoc(t, { urlPortal: e.target.value })} placeholder="https://..." />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label>Login</Label>
                                    <Input value={d.loginPortal} onChange={(e) => setDoc(t, { loginPortal: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Senha</Label>
                                    <Input type="password" value={d.senhaPortal} onChange={(e) => setDoc(t, { senhaPortal: e.target.value })} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Origem</Label>
                                <Select value={d.origem} onValueChange={(v) => setDoc(t, { origem: v as DocState["origem"] })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ESCRITORIO">Escritório</SelectItem>
                                    <SelectItem value="TERCEIROS">Software de Terceiros</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {isTerceiros && (
                                <div className="space-y-1">
                                  <Label>Nome do Sistema</Label>
                                  <Input value={d.nomeSistema} onChange={(e) => setDoc(t, { nomeSistema: e.target.value })} placeholder="Ex: Bling, Tiny..." />
                                </div>
                              )}
                            </div>

                            {isTerceiros && (
                              <div className="space-y-1">
                                <Label>Forma de Chegada</Label>
                                <Select value={d.formaChegadaId} onValueChange={(v) => setDoc(t, { formaChegadaId: v })}>
                                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    {formasChegada.length === 0 && (
                                      <div className="px-2 py-2 text-xs text-muted-foreground">Cadastre em Configurações → Formas de Chegada</div>
                                    )}
                                    {formasChegada.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="flex items-center justify-between border rounded p-3 bg-muted/20">
                              <div>
                                <p className="text-sm font-medium">Cadastrar acesso ao sistema</p>
                                <p className="text-xs text-muted-foreground">URL, login e senha (opcional)</p>
                              </div>
                              <Switch checked={temAcesso} onCheckedChange={(v) => toggleAcesso(t, v)} />
                            </div>
                            {temAcesso && (
                              <div className="space-y-3 border rounded p-3 bg-muted/30">
                                <div className="space-y-1">
                                  <Label>Link do sistema</Label>
                                  <Input value={d.urlAcesso} onChange={(e) => setDoc(t, { urlAcesso: e.target.value })} placeholder="https://..." />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label>Usuário</Label>
                                    <Input value={d.loginAcesso} onChange={(e) => setDoc(t, { loginAcesso: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Senha</Label>
                                    <Input type="password" value={d.senhaAcesso} onChange={(e) => setDoc(t, { senhaAcesso: e.target.value })} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        <div className="space-y-1">
                          <Label>Observação</Label>
                          <Textarea value={d.observacao} onChange={(e) => setDoc(t, { observacao: e.target.value })} rows={2} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklists */}
        <TabsContent value="checklists">
          <Card>
            <CardHeader>
              <CardTitle>Checklists vinculados</CardTitle>
              <p className="text-sm text-muted-foreground">Adicione ou remova checklists desta empresa. Templates GLOBAL aplicam-se automaticamente.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklists.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum checklist disponível. Cadastre em Configurações → Checklists.</p>
              )}

              {checklists.some((c) => c.escopo === "GLOBAL") && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Globais (padrão do escritório)</div>
                  {checklists.filter((c) => c.escopo === "GLOBAL").map((c) => {
                    const excluido = form.checklistExcluidosIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between border rounded-md p-3 transition-colors ${excluido ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 opacity-60" : "bg-muted/30"}`}
                      >
                        <div>
                          <div className={`text-sm font-medium ${excluido ? "line-through text-muted-foreground" : ""}`}>{c.nome}</div>
                          <div className="text-xs text-muted-foreground">{c.etapa}{excluido ? " · desativado para esta empresa" : ""}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={excluido ? "Reativar para esta empresa" : "Desativar para esta empresa"}
                          onClick={() =>
                            set(
                              "checklistExcluidosIds",
                              excluido
                                ? form.checklistExcluidosIds.filter((x) => x !== c.id)
                                : [...form.checklistExcluidosIds, c.id]
                            )
                          }
                        >
                          {excluido
                            ? <Plus className="h-4 w-4 text-emerald-600" />
                            : <X className="h-4 w-4 text-red-500" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Vinculados a esta empresa</div>
                {form.checklistTemplateIds.filter((id) => {
                  const c = checklists.find((x) => x.id === id);
                  return c && c.escopo !== "GLOBAL";
                }).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum checklist específico vinculado.</p>
                )}
                {form.checklistTemplateIds.map((id) => {
                  const c = checklists.find((x) => x.id === id);
                  if (!c || c.escopo === "GLOBAL") return null;
                  return (
                    <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <div className="text-sm font-medium">{c.nome}</div>
                        <div className="text-xs text-muted-foreground">{c.etapa} · {c.escopo}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => set("checklistTemplateIds", form.checklistTemplateIds.filter((x) => x !== c.id))}
                        title="Remover vínculo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Disponíveis para vincular</div>
                {checklists.filter((c) => c.escopo !== "GLOBAL" && !form.checklistTemplateIds.includes(c.id)).length === 0
                  ? <p className="text-xs text-muted-foreground italic">Nenhum checklist específico disponível. Crie em Configurações → Checklists.</p>
                  : checklists
                      .filter((c) => c.escopo !== "GLOBAL" && !form.checklistTemplateIds.includes(c.id))
                      .map((c) => (
                        <div key={c.id} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/40">
                          <div>
                            <div className="text-sm font-medium">{c.nome}</div>
                            <div className="text-xs text-muted-foreground">{c.etapa} · {c.escopo}</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => set("checklistTemplateIds", [...form.checklistTemplateIds, c.id])}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Vincular
                          </Button>
                        </div>
                      ))
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Erros */}
        <TabsContent value="erros">
          <Card>
            <CardHeader>
              <CardTitle>Erros vinculados</CardTitle>
              <p className="text-sm text-muted-foreground">Selecione erros do catálogo para esta empresa. Pesos por categoria vêm do cadastro do erro.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {erros.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum erro cadastrado. Vá em Configurações → Erros.</p>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Vinculados</div>
                {form.erroPossivelIds.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum erro vinculado.</p>
                )}
                {form.erroPossivelIds.map((id) => {
                  const e = erros.find((x) => x.id === id);
                  if (!e) return null;
                  return (
                    <div key={e.id} className="flex items-start justify-between border rounded-md p-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{e.nome}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {e.categorias.length === 0 && (
                            <span className="text-xs text-muted-foreground">Peso {e.peso}</span>
                          )}
                          {e.categorias.map((c) => (
                            <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                              {c} · peso {e.pesosCategoria?.[c] ?? e.peso}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => set("erroPossivelIds", form.erroPossivelIds.filter((x) => x !== e.id))}
                        title="Remover vínculo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {erros.some((e) => !form.erroPossivelIds.includes(e.id)) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Disponíveis</div>
                  {erros
                    .filter((e) => !form.erroPossivelIds.includes(e.id))
                    .map((e) => (
                      <div key={e.id} className="flex items-start justify-between border rounded-md p-3 hover:bg-muted/40">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{e.nome}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {e.categorias.length === 0 && (
                              <span className="text-xs text-muted-foreground">Peso {e.peso}</span>
                            )}
                            {e.categorias.map((c) => (
                              <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                {c} · peso {e.pesosCategoria?.[c] ?? e.peso}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => set("erroPossivelIds", [...form.erroPossivelIds, e.id])}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Vincular
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {empresa?.id ? "Salvar Alterações" : "Cadastrar Empresa"}
        </Button>
      </div>
    </form>
  );
}
