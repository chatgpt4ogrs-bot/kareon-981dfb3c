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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import AcessosPicker from "@/components/admin/AcessosPicker";
import ClinicasMultiPicker from "@/components/admin/ClinicasMultiPicker";
import UsuariosPendentesPanel from "@/components/admin/UsuariosPendentesPanel";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { APP_TABS, ROLE_DEFAULT_TABS, resolveTabs, type AppTab } from "@/lib/permissions";
import { invokeManageUser } from "@/lib/manage-user";
import { usePerfis, isStoredPerfilId, BASE_ROLE_DESCRIPTIONS } from "@/hooks/use-perfis";

const ALL_ROLES: AppRole[] = ["admin", "supervisor_plataforma", "clinica_admin", "responsavel_clinica", "terapeuta", "familiar"];
const tabLabel = (id: AppTab) => APP_TABS.find((t) => t.id === id)?.label ?? id;
const roleVariant = (r: string) =>
  r === "admin" ? "destructive" as const
  : r === "clinica_admin" || r === "supervisor_plataforma" ? "default" as const
  : "secondary" as const;

const HIDDEN_FROM_CLINIC_ROLES = new Set(["admin", "supervisor_plataforma"]);
const DECIDED_STATUSES = new Set(["ativo", "active", "inativo", "inactive"]);
/** Modo visita: ficam na seção "Aguardando aprovação", não na lista normal. */
const isPendingUser = (p: { status?: string | null; cargo?: string | null }) =>
  !DECIDED_STATUSES.has(String(p.status ?? "").toLowerCase())
  && !HIDDEN_FROM_CLINIC_ROLES.has(String(p.cargo ?? "").toLowerCase());

function mapProfileRow(p: any) {
  return {
    id: p.id,
    user_id: p.id,
    nome: p.name || p.nome || p.email,
    email: p.email,
    clinica_id: p.clinic_id || p.clinica_id || null,
    cargo: p.role || p.cargo || null,
    perfil_id: (p.perfil_id as string | null) ?? null,
    status: p.status,
    permissions: Array.isArray(p.permissions) ? (p.permissions as string[]) : null,
    gestor_clinic_ids: Array.isArray(p.gestor_clinic_ids) ? (p.gestor_clinic_ids as string[]) : [],
  };
}

/** Escopo obrigatório: fora do Admin Master, só usuários das clínicas do chamador (nunca admin/gestor). */
function scopeProfilesForCaller(
  list: ReturnType<typeof mapProfileRow>[],
  opts: { isAdmin: boolean; scope: string[] }
) {
  if (opts.isAdmin) return list;
  if (opts.scope.length === 0) return [];
  return list.filter((p) => {
    if (!p.clinica_id || !opts.scope.includes(p.clinica_id)) return false;
    const role = (p.cargo || "").toLowerCase();
    if (HIDDEN_FROM_CLINIC_ROLES.has(role)) return false;
    return true;
  });
}

const AdminUsuarios = () => {
  const { isAdmin, isPlatformSupervisor, clinicScope, canManageUsers, tabs: myTabs } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [clinicaFilter, setClinicaFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>(isAdmin ? "all" : "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showModelos, setShowModelos] = useState(false);
  const [newUser, setNewUser] = useState<{
    nome: string; email: string; password: string; cargo: string; clinica_id: string; perfil_id: string;
    roles: AppRole[]; permissions: AppTab[]; paciente_ids: string[]; gestor_clinica_ids: string[];
    ativo: boolean; must_change_password: boolean;
  }>({
    nome: "", email: "", password: "", cargo: "", clinica_id: "", perfil_id: "", roles: [], permissions: [], paciente_ids: [],
    gestor_clinica_ids: [], ativo: true, must_change_password: true,
  });
  const { perfis, perfilDoUsuario, nomeDoPerfil } = usePerfis();

  /** Clínicas que o chamador gerencia (Admin Master: todas). */
  const scope = clinicScope ?? [];
  const clinicId = scope.length === 1 ? scope[0] : null;
  const scopeKey = isAdmin ? "all" : scope.join(",");

  const { data: clinicas = [] } = useQuery({
    queryKey: ["admin-usuarios-clinicas", scopeKey],
    queryFn: async () => {
      let q = supabase.from("clinics").select("id, nome").order("nome");
      if (!isAdmin) {
        if (scope.length === 0) return [];
        q = q.in("id", scope);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: canManageUsers,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios-profiles", scopeKey],
    enabled: canManageUsers && (isAdmin || scope.length > 0),
    queryFn: async () => {
      if (!isAdmin && scope.length === 0) return [];

      let mapped: ReturnType<typeof mapProfileRow>[] = [];

      try {
        const { data, error } = await supabase.functions.invoke("manage-clinic-user", {
          body: { action: "list", include_hidden: isAdmin },
        });
        if (!error && Array.isArray(data?.profiles)) {
          mapped = data.profiles.map(mapProfileRow);
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (e) {
        console.warn("Edge function list profiles failed, using direct query:", e);
      }

      if (mapped.length === 0) {
        let q = (supabase.from("profiles") as any)
          .select("*")
          .order("name");

        // Admin de clínica: filtro no banco, não só na UI
        if (!isAdmin) {
          q = q.in("clinic_id", scope);
        }

        const { data, error } = await q;
        if (error) throw error;
        mapped = (data || []).map(mapProfileRow);
      }

      // Sempre reaplica escopo no client (protege contra edge antiga / RLS frouxo)
      return scopeProfilesForCaller(mapped, { isAdmin, scope }).filter((p) => !isPendingUser(p));
    },
  });

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      // Dupla segurança: nunca listar fora das clínicas do chamador
      if (!isAdmin) {
        if (!p.clinica_id || !scope.includes(p.clinica_id)) return false;
        if (HIDDEN_FROM_CLINIC_ROLES.has((p.cargo || "").toLowerCase())) return false;
      }
      if (clinicaFilter !== "all") {
        const inClinic = p.clinica_id === clinicaFilter || p.gestor_clinic_ids.includes(clinicaFilter);
        if (!inClinic) return false;
      }
      if (search && !`${p.nome} ${p.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (roleFilter && roleFilter !== "all") {
        if (roleFilter === "none") {
          if (p.cargo) return false;
        } else if (perfilDoUsuario(p.perfil_id, p.cargo)?.id !== roleFilter) {
          return false;
        }
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, search, clinicaFilter, roleFilter, statusFilter, isAdmin, scopeKey, perfis]);

  const getClinicaNome = (id: string | null) => clinicas.find((c) => c.id === id)?.nome || "—";
  const currentRolesOf = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.cargo ? [p.cargo as AppRole] : [];
  };

  const updateClinicaMutation = useMutation({
    mutationFn: async ({ profileId, clinicaId }: { profileId: string; clinicaId: string | null }) => {
      if (!isAdmin && !(isPlatformSupervisor && clinicaId && scope.includes(clinicaId))) {
        throw new Error("Sem permissão para transferir para esta clínica");
      }
      await invokeManageUser({ action: "update", profile_id: profileId, clinica_id: clinicaId ?? "none" });
    },
    onMutate: async ({ profileId, clinicaId }) => {
      await qc.cancelQueries({ queryKey: ["admin-usuarios-profiles"] });
      const prev = qc.getQueryData(["admin-usuarios-profiles", scopeKey]);
      qc.setQueryData(["admin-usuarios-profiles", scopeKey], (old: any[]) =>
        old?.map((p) => p.id === profileId ? { ...p, clinica_id: clinicaId } : p)
      );
      return { prev };
    },
    onError: (err: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-usuarios-profiles", scopeKey], ctx.prev);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Clínica atualizada" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ profileId, reason }: { profileId: string; reason: string }) => {
      await invokeManageUser({ action: "delete", profile_id: profileId, reason });
    },
    onSuccess: () => {
      toast({ title: "Usuário excluído" });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newUser.roles[0]) throw new Error("Selecione um perfil");
      if (isGestorSelected && newUser.gestor_clinica_ids.length === 0) {
        throw new Error("Vincule o gestor a pelo menos uma clínica");
      }
      if (!isAdmin && !isGestorSelected && scope.length > 1 && !newUser.clinica_id) {
        throw new Error("Escolha a clínica do usuário");
      }
      const payload: any = {
        action: "create",
        nome: newUser.nome,
        email: newUser.email,
        password: newUser.password,
        roles: newUser.roles,
        ...(isStoredPerfilId(newUser.perfil_id) ? { perfil_id: newUser.perfil_id } : {}),
        permissions: newUser.permissions,
        ...(isGestorSelected ? { clinica_ids: newUser.gestor_clinica_ids } : {}),
        status: newUser.ativo ? "ativo" : "inativo",
        must_change_password: newUser.must_change_password,
        clinica_id: isGestorSelected ? null : (newUser.clinica_id || clinicId || null),
      };
      await invokeManageUser(payload);
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado",
        description: isGestorSelected
          ? `Gestor de ${newUser.gestor_clinica_ids.length} clínica(s).`
          : "Já vinculado à clínica.",
      });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
      setCreateOpen(false);
      setNewUser({ nome: "", email: "", password: "", cargo: "", clinica_id: "", perfil_id: "", roles: [], permissions: [], paciente_ids: [], gestor_clinica_ids: [], ativo: true, must_change_password: true });
      setShowAdvanced(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const availableRoles: AppRole[] = isAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => !HIDDEN_FROM_CLINIC_ROLES.has(r));
  const isGestorSelected = newUser.roles.includes("supervisor_plataforma");
  const isFamiliarSelected = newUser.roles.includes("familiar");
  const grantableTabs: AppTab[] | undefined = isAdmin ? undefined : myTabs;

  const availablePerfis = perfis.filter((p) => availableRoles.includes(p.base_role));
  const selectedPerfil = perfis.find((p) => p.id === newUser.perfil_id) ?? null;

  const selectNewPerfil = (perfilId: string) => {
    const perfil = perfis.find((p) => p.id === perfilId);
    if (!perfil) return;
    const template = perfil.abas;
    setNewUser((s) => ({
      ...s,
      perfil_id: perfil.id,
      // O tipo de acesso do perfil define as regras; as abas vêm pré-marcadas e podem ser ajustadas
      roles: [perfil.base_role],
      permissions: grantableTabs ? template.filter((t) => grantableTabs.includes(t)) : template,
    }));
  };

  if (!canManageUsers) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Você não tem permissão para gerenciar usuários.
      </div>
    );
  }

  if (!isAdmin && scope.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        {isPlatformSupervisor
          ? "Nenhuma clínica está vinculada à sua conta. Entre em contato com o suporte para vincular suas clínicas."
          : "Sua conta não está vinculada a uma clínica. Entre em contato com o suporte para vincular sua conta antes de gerenciar usuários."}
      </div>
    );
  }

  const canPickClinic = isAdmin || scope.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" />
            {isAdmin ? "Usuários e permissões" : "Usuários da clínica"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Gerencie usuários de todas as clínicas e papéis do sistema."
              : scope.length > 1
              ? "Gerencie os usuários das suas clínicas."
              : "Gerencie apenas os usuários da sua clínica."}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4" /> Novo usuário
        </Button>
      </div>

      {isAdmin && <UsuariosPendentesPanel clinicas={clinicas} />}

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canPickClinic ? (
            <Select value={clinicaFilter} onValueChange={setClinicaFilter}>
              <SelectTrigger><SelectValue placeholder="Clínica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as clínicas</SelectItem>
                {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center rounded-md border border-input px-3 text-sm text-muted-foreground">
              {clinicas[0]?.nome || "Sua clínica"}
            </div>
          )}
          <Select
            value={roleFilter || undefined}
            onValueChange={setRoleFilter}
          >
            <SelectTrigger><SelectValue placeholder="Filtrar por perfil" /></SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">Todos os perfis</SelectItem>}
              {availablePerfis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              <SelectItem value="none">Sem perfil atribuído</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {(search || clinicaFilter !== "all" || (roleFilter && roleFilter !== "all") || statusFilter !== "all") && (
            <div className="lg:col-span-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} de {profiles.length} usuário(s)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setClinicaFilter("all");
                  setRoleFilter(isAdmin ? "all" : "");
                  setStatusFilter("all");
                }}
              >
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
                  <TableHead>Perfil e acessos</TableHead>
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
                        {p.cargo === "supervisor_plataforma" ? (
                          <div className="flex flex-wrap gap-1">
                            {p.gestor_clinic_ids.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Nenhuma clínica vinculada</span>
                            ) : (
                              p.gestor_clinic_ids.map((id) => (
                                <span key={id} className="text-[10px] bg-muted px-2 py-0.5 rounded">{getClinicaNome(id)}</span>
                              ))
                            )}
                          </div>
                        ) : (
                          <Select
                            value={p.clinica_id || "none"}
                            onValueChange={(v) => updateClinicaMutation.mutate({ profileId: p.id, clinicaId: v === "none" ? null : v })}
                            disabled={!canPickClinic}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {isAdmin && <SelectItem value="none">Nenhuma</SelectItem>}
                              {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Sem permissões</span>
                          ) : (
                            userRoles.map((r) => (
                              <Badge key={r} variant={roleVariant(r)} className="text-[10px]">{nomeDoPerfil(p.perfil_id, r)}</Badge>
                            ))
                          )}
                          {userRoles[0] && userRoles[0] !== "admin" && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              {resolveTabs(userRoles, p.permissions).length} de {APP_TABS.length} abas
                              {p.permissions === null && " (padrão)"}
                            </span>
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
        <CardHeader className={showModelos ? undefined : "pb-6"}>
          <button
            type="button"
            onClick={() => setShowModelos((v) => !v)}
            aria-expanded={showModelos}
            className="flex w-full items-start gap-2 text-left group"
          >
            {showModelos
              ? <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground" />
              : <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground" />}
            <span>
              <CardTitle className="text-base group-hover:text-primary transition-colors">Modelos de perfil</CardTitle>
              <span className="block text-xs text-muted-foreground mt-1">
                {showModelos
                  ? `Abas que vêm pré-marcadas ao escolher cada perfil. Os acessos de cada usuário podem ser ajustados individualmente.${isAdmin ? " Para renomear ou criar perfis, use a aba Perfis." : ""}`
                  : "Clique para ver os perfis e as abas que cada um traz pré-marcadas."}
              </span>
            </span>
          </button>
        </CardHeader>
        {showModelos && (
        <CardContent className="grid gap-3 md:grid-cols-2 animate-fade-in">
          {availablePerfis.map((perfil) => (
            <div key={perfil.id} className="border border-border rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={roleVariant(perfil.base_role)}>{perfil.nome}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{perfil.descricao || BASE_ROLE_DESCRIPTIONS[perfil.base_role]}</p>
              <div className="flex flex-wrap gap-1">
                {perfil.abas.map((t) => (
                  <span key={t} className="text-[10px] bg-muted px-2 py-0.5 rounded">{tabLabel(t)}</span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
        )}
      </Card>

      <UsuarioDetalheDrawer
        profileId={drawerProfileId}
        open={!!drawerProfileId}
        onOpenChange={(o) => { if (!o) setDrawerProfileId(null); }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Excluir usuário?"
        itemName={deleteTarget?.nome}
        description="Esta ação é permanente. O usuário perderá acesso e todos os vínculos serão removidos."
        onConfirm={async (reason) => {
          if (deleteTarget) await deleteMutation.mutateAsync({ profileId: deleteTarget.id, reason });
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário será criado e {canPickClinic ? "vinculado à clínica escolhida" : "vinculado automaticamente à sua clínica"}, com acesso imediato.
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
            <div>
              <Label>Perfil *</Label>
              <Select value={newUser.perfil_id} onValueChange={selectNewPerfil}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o perfil do usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availablePerfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPerfil && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPerfil.descricao || BASE_ROLE_DESCRIPTIONS[selectedPerfil.base_role]}
                </p>
              )}
            </div>
            {isGestorSelected && (
              <div className="space-y-2 border-t border-border pt-3 animate-fade-in">
                <div>
                  <Label>Clínicas do gestor *</Label>
                  <p className="text-xs text-muted-foreground">
                    O gestor fará a gestão somente das clínicas selecionadas.
                  </p>
                </div>
                <ClinicasMultiPicker
                  clinicas={clinicas}
                  value={newUser.gestor_clinica_ids}
                  onChange={(gestor_clinica_ids) => setNewUser({ ...newUser, gestor_clinica_ids })}
                />
              </div>
            )}
            {!isAdmin && !isGestorSelected && scope.length > 1 && newUser.roles[0] && (
              <div className="animate-fade-in">
                <Label>Clínica *</Label>
                <Select value={newUser.clinica_id} onValueChange={(v) => setNewUser({ ...newUser, clinica_id: v, paciente_ids: [] })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a clínica do usuário" /></SelectTrigger>
                  <SelectContent>
                    {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isFamiliarSelected && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                O familiar só visualiza os pacientes vinculados a ele. Sem vínculo, ele não verá nenhum paciente.
              </p>
            )}
            {newUser.roles[0] && (
              <div className="space-y-2 border-t border-border pt-3 animate-fade-in">
                <div>
                  <Label>Acessos</Label>
                  <p className="text-xs text-muted-foreground">
                    {newUser.roles[0] === "admin"
                      ? "Admin Master tem acesso a todas as abas."
                      : "Abas sugeridas pelo perfil escolhido. Marque ou desmarque o que este usuário poderá acessar."}
                  </p>
                </div>
                {newUser.roles[0] !== "admin" && (
                  <AcessosPicker
                    value={newUser.permissions}
                    onChange={(permissions) => setNewUser({ ...newUser, permissions })}
                    grantable={grantableTabs}
                  />
                )}
              </div>
            )}
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
                {isAdmin && !isGestorSelected && (
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
