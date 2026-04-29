"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Escritorio {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  usuarioConferenciaPadraoId?: string | null;
}

export function EscritorioForm({ initial, usuarios, canEdit }: { initial: Escritorio; usuarios: { id: string; nome: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: initial.nome,
    cnpj: initial.cnpj ?? "",
    email: initial.email ?? "",
    telefone: initial.telefone ?? "",
    endereco: initial.endereco ?? "",
    usuarioConferenciaPadraoId: initial.usuarioConferenciaPadraoId ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/escritorio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, usuarioConferenciaPadraoId: form.usuarioConferenciaPadraoId || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro");
      return;
    }
    toast.success("Salvo!");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1">
          <Label>Nome *</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} disabled={!canEdit} />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} disabled={!canEdit} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label>Usuário padrão de conferência</Label>
          <Select
            value={form.usuarioConferenciaPadraoId || "__none__"}
            onValueChange={(v) => setForm({ ...form, usuarioConferenciaPadraoId: v === "__none__" ? "" : v })}
            disabled={!canEdit}
          >
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Nenhum —</SelectItem>
              {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Recebe notificação ao forçar conferência em um card.</p>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
            </Button>
          </div>
        )}
        {!canEdit && <p className="text-xs text-muted-foreground">Apenas admins podem editar.</p>}
      </CardContent>
    </Card>
  );
}
