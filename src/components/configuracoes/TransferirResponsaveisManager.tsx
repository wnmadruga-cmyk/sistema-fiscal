"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  codigoInterno: string | null;
  respBuscaId: string | null;
  respElaboracaoId: string | null;
  respConferenciaId: string | null;
}

interface Usuario {
  id: string;
  nome: string;
}

interface Props {
  empresas: Empresa[];
  usuarios: Usuario[];
}

type Tipo = "busca" | "elaboracao" | "conferencia";

const TIPO_LABEL: Record<Tipo, string> = {
  busca: "Resp. Busca de Documentos",
  elaboracao: "Resp. Elaboração (card)",
  conferencia: "Resp. Conferência",
};

export function TransferirResponsaveisManager({ empresas, usuarios }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tipo, setTipo] = useState<Tipo>("elaboracao");
  const [filtroResponsavelId, setFiltroResponsavelId] = useState<string>("__todos__");
  const [novoId, setNovoId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modoCompetencia, setModoCompetencia] = useState(false);
  const [competencia, setCompetencia] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return empresas.filter((e) => {
      const matchSearch =
        !q ||
        e.razaoSocial.toLowerCase().includes(q) ||
        (e.nomeFantasia?.toLowerCase().includes(q)) ||
        (e.codigoInterno?.toLowerCase().includes(q));

      const currentId =
        tipo === "busca" ? e.respBuscaId :
        tipo === "elaboracao" ? e.respElaboracaoId :
        e.respConferenciaId;

      const matchResp =
        filtroResponsavelId === "__todos__" ||
        (filtroResponsavelId === "__nenhum__" ? !currentId : currentId === filtroResponsavelId);

      return matchSearch && matchResp;
    });
  }, [search, empresas, tipo, filtroResponsavelId]);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function responsavelNome(id: string | null) {
    if (!id) return "—";
    return usuarios.find((u) => u.id === id)?.nome ?? "—";
  }

  function currentField(e: Empresa) {
    if (tipo === "busca") return e.respBuscaId;
    if (tipo === "elaboracao") return e.respElaboracaoId;
    return e.respConferenciaId;
  }

  async function doTransfer(permanente: boolean) {
    if (!novoId) { toast.error("Selecione o novo responsável"); return; }
    if (selected.size === 0) { toast.error("Selecione pelo menos uma empresa"); return; }
    if (!permanente && !competencia) { toast.error("Informe a competência"); return; }

    setSaving(true);
    const res = await fetch("/api/empresas/responsaveis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaIds: [...selected],
        tipo,
        responsavelId: novoId,
        permanente,
        competencia: !permanente ? competencia : undefined,
      }),
    });
    setSaving(false);
    setConfirmOpen(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao transferir");
      return;
    }
    const d = await res.json();
    toast.success(`${d.data?.updated ?? selected.size} empresa(s) atualizadas`);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-48">
          <Label>Tipo de responsável</Label>
          <Select value={tipo} onValueChange={(v) => { setTipo(v as Tipo); setFiltroResponsavelId("__todos__"); setSelected(new Set()); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => (
                <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex-1 min-w-48">
          <Label>Filtrar por responsável atual</Label>
          <Select value={filtroResponsavelId} onValueChange={(v) => { setFiltroResponsavelId(v); setSelected(new Set()); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos</SelectItem>
              <SelectItem value="__nenhum__">
                <span className="text-muted-foreground">Sem responsável</span>
              </SelectItem>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex-1 min-w-48">
          <Label>Novo responsável</Label>
          <Select value={novoId} onValueChange={setNovoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar usuário..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">Remover responsável</span>
              </SelectItem>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          disabled={selected.size === 0 || !novoId}
          onClick={() => setConfirmOpen(true)}
        >
          <Users className="h-4 w-4 mr-1" />
          Transferir ({selected.size})
        </Button>
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-primary hover:underline"
        >
          {selected.size === filtered.length && filtered.length > 0 ? "Desmarcar todos" : `Selecionar todos (${filtered.length})`}
        </button>
        {selected.size > 0 && (
          <Badge variant="secondary">{selected.size} selecionadas</Badge>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-8 px-3 py-2.5"></th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Empresa</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">{TIPO_LABEL[tipo]} atual</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-muted-foreground">Nenhuma empresa encontrada</td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr
                key={e.id}
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${selected.has(e.id) ? "bg-primary/5" : ""}`}
                onClick={() => toggle(e.id)}
              >
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} onClick={(ev) => ev.stopPropagation()} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {e.codigoInterno && <span className="text-xs font-mono text-muted-foreground">{e.codigoInterno}</span>}
                    <span className="font-medium">{e.nomeFantasia ?? e.razaoSocial}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{responsavelNome(currentField(e))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm">
              Transferir <strong>{selected.size} empresa(s)</strong> para{" "}
              <strong>{usuarios.find((u) => u.id === novoId)?.nome ?? "—"}</strong> como{" "}
              <strong>{TIPO_LABEL[tipo]}</strong>.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Escopo da alteração</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="modo"
                    checked={!modoCompetencia}
                    onChange={() => setModoCompetencia(false)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Permanente</p>
                    <p className="text-xs text-muted-foreground">
                      Atualiza o cadastro da empresa{tipo === "elaboracao" ? " e todos os cards abertos" : ""}.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="modo"
                    checked={modoCompetencia}
                    onChange={() => setModoCompetencia(true)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Só para uma competência</p>
                    <p className="text-xs text-muted-foreground">
                      {tipo === "elaboracao"
                        ? "Atualiza apenas os cards da competência informada."
                        : "Disponível apenas para responsável de elaboração (campo do card)."}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {modoCompetencia && (
              <div className="space-y-1">
                <Label>Competência (YYYY-MM)</Label>
                <Input
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  placeholder="2025-01"
                  maxLength={7}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              disabled={saving || (modoCompetencia && !competencia)}
              onClick={() => doTransfer(!modoCompetencia)}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
