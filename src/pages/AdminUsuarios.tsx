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
import { Shield, Search, Loader2, Pencil } from "lucide-react";
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

const AdminUsuarios = () => {
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [clinicaFilter, setClinicaFilter] = useState<string>(isAdmin ? "all" : (profile?.clinica_id || "all"));
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      </div>

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
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
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
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawerProfileId(p.id)}>
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </Button>
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
    </div>
  );
};

export default AdminUsuarios;
