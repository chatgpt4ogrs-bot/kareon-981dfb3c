import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, IdCard, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import AcessosPicker from "@/components/admin/AcessosPicker";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { APP_TABS, ROLE_DEFAULT_TABS, type AppTab } from "@/lib/permissions";
import { deleteWithAudit } from "@/lib/audit";
import {
  usePerfis, BASE_ROLES, BASE_ROLE_LABELS, BASE_ROLE_DESCRIPTIONS, type PerfilAcesso,
} from "@/hooks/use-perfis";

const CUSTOM_BASE_ROLES = BASE_ROLES.filter((r) => r !== "admin");

const BASE_ROLE_HINTS: Partial<Record<AppRole, string>> = {
  supervisor_plataforma: "No cadastro, o Admin Master escolhe as clínicas que ele vai gerir.",
  familiar: "No cadastro, será obrigatório vincular um ou mais pacientes.",
};

type FormState = { nome: string; descricao: string; base_role: AppRole | ""; abas: AppTab[] };
const emptyForm: FormState = { nome: "", descricao: "", base_role: "", abas: [] };

const tabLabel = (id: AppTab) => APP_TABS.find((t) => t.id === id)?.label ?? id;

const PerfisPanel = () => {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { perfis, missingTable, isLoading } = usePerfis();
  const [editing, setEditing] = useState<PerfilAcesso | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<PerfilAcesso | null>(null);

  const canEdit = isAdmin && !missingTable;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (perfil: PerfilAcesso) => {
    setEditing(perfil);
    setForm({
      nome: perfil.nome,
      descricao: perfil.descricao ?? "",
      base_role: perfil.base_role,
      abas: perfil.abas,
    });
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim();
      if (nome.length < 2) throw new Error("Informe o nome do perfil");
      if (!form.base_role) throw new Error("Escolha o tipo de acesso");
      const duplicated = perfis.some(
        (p) => p.id !== editing?.id && p.nome.trim().toLowerCase() === nome.toLowerCase(),
      );
      if (duplicated) throw new Error("Já existe um perfil com esse nome");

      const payload: Record<string, unknown> = {
        nome,
        descricao: form.descricao.trim() || null,
        abas: form.base_role === "admin" ? APP_TABS.map((t) => t.id) : form.abas,
      };
      if (editing) {
        await api(`/perfis-acesso/${editing.id}`, { method: "PUT", json: payload });
      } else {
        await api("/perfis-acesso", {
          method: "POST",
          json: { ...payload, base_role: form.base_role },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfis-acesso"] });
      toast({ title: editing ? "Perfil atualizado" : "Perfil criado" });
      setFormOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await deleteWithAudit("perfil", id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfis-acesso"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Perfil excluído" });
      setToDelete(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const isSystemEditing = !!editing?.is_system;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <IdCard className="w-5 h-5" /> Perfis
          </h2>
          <p className="text-sm text-muted-foreground">
            Renomeie os perfis pré-cadastrados ou crie novos. O nome escolhido aparece no cadastro de usuários.
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Novo perfil
          </Button>
        )}
      </div>

      {missingTable && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Não foi possível carregar os perfis do banco. Os perfis padrão abaixo continuam disponíveis;
            confira se a API e o PostgreSQL estão no ar.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {perfis.map((perfil) => (
            <Card key={perfil.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{perfil.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Tipo de acesso: {BASE_ROLE_LABELS[perfil.base_role]}
                    </p>
                  </div>
                  <Badge variant={perfil.is_system ? "secondary" : "default"} className="text-[10px] shrink-0">
                    {perfil.is_system ? "Pré-cadastrado" : "Personalizado"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {perfil.descricao || BASE_ROLE_DESCRIPTIONS[perfil.base_role]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {perfil.base_role === "admin" ? (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Todas as abas</span>
                  ) : perfil.abas.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic">Nenhuma aba pré-marcada</span>
                  ) : (
                    perfil.abas.map((t) => (
                      <span key={t} className="text-[10px] bg-muted px-2 py-0.5 rounded">{tabLabel(t)}</span>
                    ))
                  )}
                </div>
                {canEdit && (
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(perfil)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    {!perfil.is_system && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(perfil)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar perfil" : "Novo perfil"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Alterar as abas padrão vale para os próximos cadastros; usuários existentes mantêm os acessos que já têm."
                : "Dê um nome ao perfil e escolha o tipo de acesso que ele segue."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
            className="space-y-4"
          >
            <div>
              <Label>Nome do perfil *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Fisioterapeuta, Recepção, Coordenação"
                required
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Opcional: o que este perfil faz"
                rows={2}
              />
            </div>
            <div>
              <Label>Tipo de acesso *</Label>
              <Select
                value={form.base_role || undefined}
                onValueChange={(v) => {
                  const role = v as AppRole;
                  setForm({ ...form, base_role: role, abas: ROLE_DEFAULT_TABS[role] ?? [] });
                }}
                disabled={isSystemEditing}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o tipo de acesso" /></SelectTrigger>
                <SelectContent>
                  {(isSystemEditing ? BASE_ROLES : CUSTOM_BASE_ROLES).map((r) => (
                    <SelectItem key={r} value={r}>{BASE_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {isSystemEditing
                  ? "O tipo de acesso de um perfil pré-cadastrado não pode ser alterado; apenas o nome, a descrição e as abas."
                  : form.base_role
                  ? `${BASE_ROLE_DESCRIPTIONS[form.base_role]} ${BASE_ROLE_HINTS[form.base_role] ?? ""}`
                  : "Define as regras do sistema que o perfil segue (ex.: familiar vê só os pacientes vinculados)."}
              </p>
            </div>
            {form.base_role && (
              <div className="space-y-2 border-t border-border pt-3">
                <div>
                  <Label>Abas pré-marcadas</Label>
                  <p className="text-xs text-muted-foreground">
                    {form.base_role === "admin"
                      ? "Admin Master tem acesso a todas as abas."
                      : "Abas que vêm marcadas ao cadastrar um usuário com este perfil. Podem ser ajustadas em cada usuário."}
                  </p>
                </div>
                {form.base_role !== "admin" && (
                  <AcessosPicker value={form.abas} onChange={(abas) => setForm({ ...form, abas })} />
                )}
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : editing ? "Salvar" : "Criar perfil"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title="Excluir perfil?"
        itemName={toDelete?.nome}
        description="O perfil deixará de aparecer no cadastro de usuários. Perfis em uso por algum usuário não podem ser excluídos."
        onConfirm={async (reason) => {
          if (toDelete) await deleteMutation.mutateAsync({ id: toDelete.id, reason });
        }}
      />
    </div>
  );
};

export default PerfisPanel;
