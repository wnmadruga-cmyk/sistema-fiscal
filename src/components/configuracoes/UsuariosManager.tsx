"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, User, Briefcase, Pencil } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  avatar: string | null;
  createdAt: Date;
}
interface Empresa {
  id: string;
  nome: string;
  respBuscaId: string | null;
  respElaboracaoId: string | null;
  respConferenciaId: string | null;
}
interface Resp { empresaId: string; busca: boolean; elaboracao: boolean; conferencia: boolean }

type PerfilOpt = "ADMIN" | "GERENTE" | "OPERACIONAL" | "CONFERENTE";

const PERFIL_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  GERENTE: "Gerente",
  OPERACIONAL: "Operacional",
  CONFERENTE: "Conferente",
};

const emptyCreate: { nome: string; email: string; password: string; perfil: PerfilOpt } = {
  nome: "", email: "", password: "", perfil: "OPERACIONAL",
};

export function UsuariosManager({
  initial,
  empresas,
  canManage,
  usuarioAtualId,
}: {
  initial: Usuario[];
  empresas: Empresa[];
  canManage: boolean;
  usuarioAtualId?: string;
}) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>(initial);

  // Criar
  const [openNew, setOpenNew] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);

  // Editar
  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "", perfil: "OPERACIONAL" as PerfilOpt, novaSenha: "" });

  // Responsabilidades
  const [openResp, setOpenResp] = useState(false);
  const [respTarget, setRespTarget] = useState<Usuario | null>(null);
  const [resp, setResp] = useState<Resp[]>([]);
  const [filter, setFilter] = useState("");

  const [saving, setSaving] = useState(false);

  // ─── Criar ────────────────────────────────────────────────
  async function createUser() {
    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      const firstIssue = Array.isArray(d.errors) && d.errors.length > 0 ? d.errors[0] : null;
      const fieldLabel: Record<string, string> = { nome: "Nome", email: "E-mail", password: "Senha", perfil: "Perfil" };
      if (firstIssue) {
        const field = firstIssue.path?.[0] ? (fieldLabel[firstIssue.path[0]] ?? firstIssue.path[0]) : "";
        toast.error(`${field ? field + ": " : ""}${firstIssue.message}`);
      } else {
        toast.error(d.error ?? "Erro ao criar");
      }
      return;
    }
    const { data: novo } = await res.json();
    setUsuarios((prev) => [...prev, { ...novo, ativo: true }].sort((a, b) => a.nome.localeCompare(b.nome)));
    toast.success("Usuário criado!");
    setCreateForm(emptyCreate);
    setOpenNew(false);
  }

  // ─── Editar ───────────────────────────────────────────────
  function openEditDialog(u: Usuario) {
    setEditTarget(u);
    setEditForm({ nome: u.nome, email: u.email, perfil: u.perfil as PerfilOpt, novaSenha: "" });
    setOpenEdit(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      nome: editForm.nome,
      email: editForm.email,
      perfil: editForm.perfil,
    };
    if (editForm.novaSenha.trim()) body.novaSenha = editForm.novaSenha;

    const res = await fetch(`/api/usuarios/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === editTarget.id
          ? { ...u, nome: editForm.nome, email: editForm.email, perfil: editForm.perfil }
          : u
      )
    );
    toast.success("Usuário atualizado!");
    setOpenEdit(false);
    router.refresh();
  }

  // ─── Inativar / Reativar ───────────────────────────────────
  async function toggleAtivo(u: Usuario) {
    const acao = u.ativo ? "inativar" : "reativar";
    if (!confirm(`Deseja ${acao} o usuário ${u.nome}?`)) return;
    setSaving(true);
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? `Erro ao ${acao}`);
      return;
    }
    setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, ativo: !u.ativo } : x));
    toast.success(`Usuário ${u.ativo ? "inativado" : "reativado"}!`);
  }

  // ─── Responsabilidades ─────────────────────────────────────
  function openRespDialog(u: Usuario) {
    setRespTarget(u);
    setResp(empresas.map((e) => ({
      empresaId: e.id,
      busca: e.respBuscaId === u.id,
      elaboracao: e.respElaboracaoId === u.id,
      conferencia: e.respConferenciaId === u.id,
    })));
    setFilter("");
    setOpenResp(true);
  }

  function toggle(empresaId: string, role: "busca" | "elaboracao" | "conferencia") {
    setResp((r) => r.map((x) => x.empresaId === empresaId ? { ...x, [role]: !x[role] } : x));
  }

  async function saveResp() {
    if (!respTarget) return;
    setSaving(true);
    const res = await fetch(`/api/usuarios/${respTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsabilidades: resp }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    toast.success("Responsabilidades atualizadas!");
    setOpenResp(false);
    router.refresh();
  }

  function countResp(uId: string) {
    return empresas.reduce(
      (acc, e) => acc + (e.respBuscaId === uId ? 1 : 0) + (e.respElaboracaoId === uId ? 1 : 0) + (e.respConferenciaId === uId ? 1 : 0),
      0
    );
  }

  const filteredEmpresas = resp
    .map((r) => ({ ...r, nome: empresas.find((e) => e.id === r.empresaId)?.nome ?? "" }))
    .filter((r) => r.nome.toLowerCase().includes(filter.toLowerCase()));

  const ativos = usuarios.filter((u) => u.ativo);
  const inativos = usuarios.filter((u) => !u.ativo);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Usuário
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {ativos.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <Badge variant="outline">{PERFIL_LABEL[u.perfil] ?? u.perfil}</Badge>
              <Badge variant="secondary">{countResp(u.id)} resp.</Badge>
              {canManage && (
                <>
                  <Button size="sm" variant="ghost" title="Editar" onClick={() => openEditDialog(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Responsabilidades" onClick={() => openRespDialog(u)}>
                    <Briefcase className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {inativos.length > 0 && canManage && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inativos</p>
          {inativos.map((u) => (
            <Card key={u.id} className="opacity-50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <Badge variant="outline" className="text-xs">{PERFIL_LABEL[u.perfil] ?? u.perfil}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggleAtivo(u)} disabled={saving}>
                  Reativar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialog: Criar ── */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={createForm.nome} onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Senha inicial * <span className="text-xs text-muted-foreground">(mín. 6 caracteres)</span></Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Perfil</Label>
              <Select value={createForm.perfil} onValueChange={(v) => setCreateForm({ ...createForm, perfil: v as PerfilOpt })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="GERENTE">Gerente</SelectItem>
                  <SelectItem value="OPERACIONAL">Operacional</SelectItem>
                  <SelectItem value="CONFERENTE">Conferente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button onClick={createUser} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar ── */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário — {editTarget?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Perfil</Label>
              <Select value={editForm.perfil} onValueChange={(v) => setEditForm({ ...editForm, perfil: v as PerfilOpt })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="GERENTE">Gerente</SelectItem>
                  <SelectItem value="OPERACIONAL">Operacional</SelectItem>
                  <SelectItem value="CONFERENTE">Conferente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nova senha <span className="text-xs text-muted-foreground">(deixe vazio para não alterar)</span></Label>
              <Input type="password" placeholder="••••••" value={editForm.novaSenha} onChange={(e) => setEditForm({ ...editForm, novaSenha: e.target.value })} />
            </div>
            <div className="flex items-center justify-between pt-1 border-t">
              {editTarget?.id !== usuarioAtualId ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={saving}
                  onClick={() => { setOpenEdit(false); editTarget && toggleAtivo(editTarget); }}
                >
                  Inativar usuário
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Responsabilidades ── */}
      <Dialog open={openResp} onOpenChange={setOpenResp}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Responsabilidades — {respTarget?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Marque quais empresas o usuário é responsável e em qual etapa.
            </p>
            <Input placeholder="Buscar empresa..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="border rounded">
              <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 p-2 text-xs font-medium border-b bg-muted/50">
                <div>Empresa</div>
                <div className="text-center">Busca</div>
                <div className="text-center">Elaboração</div>
                <div className="text-center">Conferência</div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredEmpresas.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma empresa</p>
                )}
                {filteredEmpresas.map((r) => (
                  <div key={r.empresaId} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 p-2 text-sm border-b items-center">
                    <div className="truncate">{r.nome}</div>
                    <div className="text-center"><input type="checkbox" checked={r.busca} onChange={() => toggle(r.empresaId, "busca")} /></div>
                    <div className="text-center"><input type="checkbox" checked={r.elaboracao} onChange={() => toggle(r.empresaId, "elaboracao")} /></div>
                    <div className="text-center"><input type="checkbox" checked={r.conferencia} onChange={() => toggle(r.empresaId, "conferencia")} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenResp(false)}>Cancelar</Button>
              <Button onClick={saveResp} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
