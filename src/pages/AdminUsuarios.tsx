import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Shield, Search, AlertTriangle, Plus, Minus, Save, RotateCcw, Loader2, Eye } from "lucide-react";
import UsuarioDetalheDrawer from "@/components/admin/UsuarioDetalheDrawer";

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

type StagedChange = { userId: string; role: AppRole; action: "add" | "remove" };

const AdminUsuarios = () => {
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [clinicaFilter, setClinicaFilter] = useState<string>(isAdmin ? "all" : (profile?.clinica_id || "all"));
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staged, setStaged] = useState<StagedChange[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);

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
      if (isAdmin && clinicaFilter !== "all" && p.clinica_id !== clinicaFilter) return false;
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

  const isRoleAssignable = (role: AppRole) => {
    if (isAdmin) return true;
    return role !== "admin";
  };

  const toggleRole = (userId: string, role: AppRole, currentlyHas: boolean) => {
    if (!isRoleAssignable(role)) {
      toast({ title: "Permissão não autorizada", description: "Apenas Admin Master pode atribuir esta role.", variant: "destructive" });
      return;
    }
    setStaged((prev) => {
      const without = prev.filter((s) => !(s.userId === userId && s.role === role));
      const wasStaged = prev.find((s) => s.userId === userId && s.role === role);
      if (wasStaged) return without;
      const desiredAction: "add" | "remove" = currentlyHas ? "remove" : "add";
      return [...without, { userId, role, action: desiredAction }];
    });
  };

  const effectiveRolesOf = (userId: string): AppRole[] => {
    const base = new Set(currentRolesOf(userId));
    staged.filter((s) => s.userId === userId).forEach((s) => {
      if (s.action === "add") base.add(s.role);
      else base.delete(s.role);
    });
    return Array.from(base);
  };

  const stagedChangesByUser = useMemo(() => {
    const map = new Map<string, StagedChange[]>();
    staged.forEach((s) => {
      const arr = map.get(s.userId) || [];
      arr.push(s);
      map.set(s.userId, arr);
    });
    return map;
  }, [staged]);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const adds = staged.filter((s) => s.action === "add");
      const removes = staged.filter((s) => s.action === "remove");
      if (adds.length > 0) {
        const { error } = await supabase.from("user_roles").insert(
          adds.map((a) => ({ user_id: a.userId, role: a.role as any }))
        );
        if (error) throw error;
      }
      for (const r of removes) {
        const row = roles.find((x) => x.user_id === r.userId && x.role === r.role);
        if (row) {
          const { error } = await supabase.from("user_roles").delete().eq("id", row.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Permissões atualizadas", description: `${staged.length} alteração(ões) aplicada(s).` });
      setStaged([]);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-usuarios-roles"] });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const hasChanges = staged.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" /> Usuários e permissões
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie clínicas vinculadas e atribua roles. Alterações de permissão são revisadas antes de salvar.
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setStaged([])} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Descartar
            </Button>
          )}
          <Button onClick={() => setConfirmOpen(true)} disabled={!hasChanges} className="gap-2">
            <Save className="w-4 h-4" /> Revisar e salvar ({staged.length})
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              Você tem <strong>{staged.length} alteração(ões) pendente(s)</strong> de permissão. Revise antes de salvar — mudanças afetam imediatamente o que cada usuário vê e pode fazer.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isAdmin && (
            <Select value={clinicaFilter} onValueChange={setClinicaFilter}>
              <SelectTrigger><SelectValue placeholder="Clínica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as clínicas</SelectItem>
                {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
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
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setClinicaFilter(isAdmin ? "all" : (profile?.clinica_id || "all")); setRoleFilter("all"); setStatusFilter("all"); }}>
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
                  {isAdmin && <TableHead className="min-w-[180px]">Clínica</TableHead>}
                  {ALL_ROLES.map((r) => (
                    <TableHead key={r} className="text-center min-w-[100px]">
                      <span className="text-xs font-medium">{roleLabels[r]}</span>
                    </TableHead>
                  ))}
                  <TableHead className="w-16 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userChanges = stagedChangesByUser.get(p.user_id) || [];
                  return (
                    <TableRow key={p.id} className={userChanges.length > 0 ? "bg-amber-50/30" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                          {userChanges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {userChanges.map((c, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] gap-1">
                                  {c.action === "add" ? <Plus className="w-2.5 h-2.5 text-green-600" /> : <Minus className="w-2.5 h-2.5 text-red-600" />}
                                  {roleLabels[c.role]}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Select
                            value={p.clinica_id || "none"}
                            onValueChange={(v) => updateClinicaMutation.mutate({ profileId: p.id, clinicaId: v === "none" ? null : v })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {ALL_ROLES.map((r) => {
                        const has = currentRolesOf(p.user_id).includes(r);
                        const willHave = effectiveRolesOf(p.user_id).includes(r);
                        const changed = has !== willHave;
                        const disabled = !isRoleAssignable(r);
                        return (
                          <TableCell key={r} className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={willHave}
                                disabled={disabled}
                                onCheckedChange={() => toggleRole(p.user_id, r, has)}
                                className={changed ? "ring-2 ring-amber-400" : ""}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDrawerProfileId(p.id)} title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alterações de permissões</AlertDialogTitle>
            <AlertDialogDescription>
              As mudanças abaixo serão aplicadas imediatamente. Os usuários afetados podem ganhar ou perder acesso a áreas do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-3">
            {Array.from(stagedChangesByUser.entries()).map(([uid, changes]) => {
              const user = profiles.find((p) => p.user_id === uid);
              const before = currentRolesOf(uid);
              const after = effectiveRolesOf(uid);
              const gained = after.filter((r) => !before.includes(r));
              const lost = before.filter((r) => !after.includes(r));
              return (
                <div key={uid} className="border border-border rounded-md p-3">
                  <p className="font-medium text-sm text-foreground">{user?.nome}</p>
                  <p className="text-xs text-muted-foreground mb-2">{user?.email}</p>
                  {gained.length > 0 && (
                    <div className="text-xs mb-1">
                      <span className="text-green-700 font-medium">+ Ganha:</span>{" "}
                      {gained.map((r) => roleLabels[r]).join(", ")}
                      <div className="text-[11px] text-muted-foreground mt-0.5 ml-3">
                        Acesso a: {gained.flatMap((r) => rolePermissions[r]).join(", ")}
                      </div>
                    </div>
                  )}
                  {lost.length > 0 && (
                    <div className="text-xs">
                      <span className="text-red-700 font-medium">− Perde:</span>{" "}
                      {lost.map((r) => roleLabels[r]).join(", ")}
                    </div>
                  )}
                  {after.length === 0 && (
                    <div className="text-xs text-amber-700 mt-1">
                      ⚠ Usuário ficará sem nenhuma role e não conseguirá acessar áreas restritas.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); saveMutation.mutate(); }} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Confirmar e salvar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UsuarioDetalheDrawer
        profileId={drawerProfileId}
        open={!!drawerProfileId}
        onOpenChange={(o) => { if (!o) setDrawerProfileId(null); }}
      />
    </div>
  );
};

export default AdminUsuarios;
