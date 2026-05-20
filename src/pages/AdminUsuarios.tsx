import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Shield, Search, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import UsuarioDetalheDrawer from "@/components/admin/UsuarioDetalheDrawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const ALL_ROLES: AppRole[] = ["admin", "clinica_admin", "responsavel_clinica", "terapeuta", "familiar"];
const roleLabels: Record<AppRole, string> = {
  admin: "Admin Master",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Terapeuta",
  familiar: "Familiar",
};
const roleDescriptions: Record<AppRole, string> = {
  admin: "Acesso total ao sistema, todas as clínicas.",
  clinica_admin: "Gerencia configurações, usuários e dados da clínica.",
  responsavel_clinica: "Gestão operacional da clínica (pacientes, agenda, câmeras).",
  terapeuta: "Atende pacientes designados, registra sessões e objetivos.",
  familiar: "Visualiza informações e câmeras dos pacientes vinculados.",
};
const rolePermissions: Record<AppRole, string[]> = {
  admin: ["Painel administrativo", "Todas as clínicas", "Gerenciar permissões"],
  clinica_admin: ["Pacientes", "Agenda", "Câmeras", "Usuários da clínica"],
  responsavel_clinica: ["Pacientes", "Agenda", "Câmeras"],
  terapeuta: ["Pacientes designados", "Agenda", "Sessões e objetivos"],
  familiar: ["Câmeras vinculadas", "Visualização do paciente"],
};
const roleVariant = (r: string) => r === "admin" ? "destructive" as const : r === "clinica_admin" ? "default" as const : "secondary" as const;

const AdminUsuarios = () => {
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [clinicaFilter, setClinicaFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newUser, setNewUser] = useState<{
    nome: string; email: string; password: string; cargo: string; clinica_id: string;
    roles: AppRole[]; ativo: boolean; must_change_password: boolean;
  }>({
    nome: "", email: "", password: "", cargo: "", clinica_id: "", roles: [],
    ativo: true, must_change_password: true,
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["admin-usuarios-clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios-profiles", isAdmin, profile?.clinica_id],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, user_id, nome, email, clinica_id, status").order("nome");
      if (!isAdmin && profile?.clinica_id) q = q.eq("clinica_id", profile.clinica_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const userIds = profiles.map((p) => p.user_id);
  const { data: roles = [] } = useQuery({
    queryKey: ["admin-usuarios-roles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role").in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (clinicaFilter !== "all" && p.clinica_id !== clinicaFilter) return false;
      if (search && !`${p.nome} ${p.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (roleFilter !== "all") {
        const userRoles = roles.filter((r) => r.user_id === p.user_id).map((r) => r.role);
        if (roleFilter === "none") {
          if (userRoles.length > 0) return false;
        } else if (!userRoles.includes(roleFilter as any)) {
          return false;
        }
      }
      return true;
    });
  }, [profiles, search, clinicaFilter, roleFilter, statusFilter, roles, isAdmin]);

  const getClinicaNome = (id: string | null) => clinicas.find((c) => c.id === id)?.nome || "—";
  const currentRolesOf = (userId: string) => roles.filter((r) => r.user_id === userId).map((r) => r.role as AppRole);

  const updateClinicaMutation = useMutation({
    mutationFn: async ({ profileId, clinicaId }: { profileId: string; clinicaId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ clinica_id: clinicaId }).eq("id", profileId);
      if (error) throw error;
    },
    onMutate: async ({ profileId, clinicaId }) => {
      await qc.cancelQueries({ queryKey: ["admin-usuarios-profiles"] });
      const prev = qc.getQueryData(["admin-usuarios-profiles", isAdmin, profile?.clinica_id]);
      qc.setQueryData(["admin-usuarios-profiles", isAdmin, profile?.clinica_id], (old: any[]) =>
        old?.map((p) => p.id === profileId ? { ...p, clinica_id: clinicaId } : p)
      );
      return { prev };
    },
    onError: (err: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-usuarios-profiles", isAdmin, profile?.clinica_id], ctx.prev);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Clínica atualizada" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-clinic-user", {
        body: { action: "delete", profile_id: profileId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Usuário excluído" });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        action: "create",
        nome: newUser.nome,
        email: newUser.email,
        password: newUser.password,
        cargo: newUser.cargo || null,
        roles: newUser.roles,
        status: newUser.ativo ? "ativo" : "inativo",
        must_change_password: newUser.must_change_password,
      };
      if (isAdmin && newUser.clinica_id) payload.clinica_id = newUser.clinica_id;
      const { data, error } = await supabase.functions.invoke("manage-clinic-user", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Usuário criado", description: "Já vinculado à clínica." });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
      setCreateOpen(false);
      setNewUser({ nome: "", email: "", password: "", cargo: "", clinica_id: "", roles: [], ativo: true, must_change_password: true });
      setShowAdvanced(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const availableRoles: AppRole[] = isAdmin
    ? ALL_ROLES
    : (ALL_ROLES.filter((r) => r !== "admin") as AppRole[]);

  const toggleNewRole = (r: AppRole) => {
    setNewUser((s) => ({
      ...s,
      roles: s.roles.includes(r) ? s.roles.filter((x) => x !== r) : [...s.roles, r],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" /> Usuários e permissões
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie clínicas vinculadas e clique em <strong>Editar</strong> para ajustar permissões de cada usuário.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4" /> Novo usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={clinicaFilter} onValueChange={setClinicaFilter}>
              <SelectTrigger><SelectValue placeholder="Clínica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as clínicas</SelectItem>
                {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as roles</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
              <SelectItem value="none">Sem role atribuída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {(search || clinicaFilter !== "all" || roleFilter !== "all" || statusFilter !== "all") && (
            <div className="lg:col-span-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} de {profiles.length} usuário(s)</span>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setClinicaFilter("all"); setRoleFilter("all"); setStatusFilter("all"); }}>
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="min-w-[180px]">Clínica</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-40 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRoles = currentRolesOf(p.user_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                          <Select
                            value={p.clinica_id || "none"}
                            onValueChange={(v) => updateClinicaMutation.mutate({ profileId: p.id, clinicaId: v === "none" ? null : v })}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Sem permissões</span>
                          ) : (
                            userRoles.map((r) => (
                              <Badge key={r} variant={roleVariant(r)} className="text-[10px]">{roleLabels[r]}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawerProfileId(p.id)}>
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: p.id, nome: p.nome })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Referência de roles</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {ALL_ROLES.map((r) => (
            <div key={r} className="border border-border rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={roleVariant(r)}>{roleLabels[r]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{roleDescriptions[r]}</p>
              <div className="flex flex-wrap gap-1">
                {rolePermissions[r].map((perm) => (
                  <span key={perm} className="text-[10px] bg-muted px-2 py-0.5 rounded">{perm}</span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <UsuarioDetalheDrawer
        profileId={drawerProfileId}
        open={!!drawerProfileId}
        onOpenChange={(o) => { if (!o) setDrawerProfileId(null); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. <strong>{deleteTarget?.nome}</strong> perderá acesso e todos os vínculos serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário será criado e {isAdmin ? "vinculado à clínica escolhida" : "vinculado automaticamente à sua clínica"}, com acesso imediato.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            className="space-y-3"
          >
            <div>
              <Label>Nome</Label>
              <Input value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
            </div>
            <div>
              <Label>Senha inicial</Label>
              <Input type="text" minLength={6} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres. Compartilhe com o usuário.</p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Configurações avançadas
              </button>
            </div>
            {showAdvanced && (
              <div className="space-y-3 border-l-2 border-border pl-3">
                <div>
                  <Label>Cargo (opcional)</Label>
                  <Input value={newUser.cargo} onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })} placeholder="Ex.: Terapeuta sênior" />
                </div>
                {isAdmin && (
                  <div>
                    <Label>Clínica</Label>
                    <Select value={newUser.clinica_id} onValueChange={(v) => setNewUser({ ...newUser, clinica_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Permissões</Label>
                  <div className="mt-2 space-y-2">
                    {availableRoles.map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={newUser.roles.includes(r)}
                          onCheckedChange={() => toggleNewRole(r)}
                        />
                        <span>{roleLabels[r]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm">Usuário ativo</Label>
                      <p className="text-xs text-muted-foreground">Quando desativado, o usuário não consegue acessar o sistema.</p>
                    </div>
                    <Switch
                      checked={newUser.ativo}
                      onCheckedChange={(v) => setNewUser({ ...newUser, ativo: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm">Exigir troca de senha no primeiro login</Label>
                      <p className="text-xs text-muted-foreground">Ao entrar, o usuário será obrigado a definir uma nova senha.</p>
                    </div>
                    <Switch
                      checked={newUser.must_change_password}
                      onCheckedChange={(v) => setNewUser({ ...newUser, must_change_password: v })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsuarios;
