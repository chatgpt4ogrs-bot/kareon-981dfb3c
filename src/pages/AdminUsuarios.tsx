import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Users, Settings2 } from "lucide-react";
import { format } from "date-fns";
import type { AppRole } from "@/contexts/AuthContext";

const roleLabels: Record<string, string> = {
  admin: "Admin Master",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Terapeuta",
  familiar: "Familiar",
};

const roleBadgeVariant = (role: string) => {
  if (role === "admin") return "destructive" as const;
  if (role === "clinica_admin") return "default" as const;
  return "secondary" as const;
};

const AdminUsuarios = () => {
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedClinica, setSelectedClinica] = useState<string>("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["admin-clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const getUserRoles = (userId: string) => allRoles.filter((r) => r.user_id === userId);
  const getClinicaNome = (clinicaId: string | null) => clinicas.find((c) => c.id === clinicaId)?.nome || "—";

  const updateClinicaMutation = useMutation({
    mutationFn: async ({ profileId, clinicaId }: { profileId: string; clinicaId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ clinica_id: clinicaId }).eq("id", profileId);
      if (error) throw error;
    },
    onMutate: async ({ profileId, clinicaId }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-profiles"] });
      const prev = queryClient.getQueryData(["admin-profiles"]);
      queryClient.setQueryData(["admin-profiles"], (old: any[]) =>
        old?.map((p) => p.id === profileId ? { ...p, clinica_id: clinicaId } : p)
      );
      if (editUser?.id === profileId) setEditUser((u: any) => ({ ...u, clinica_id: clinicaId }));
      toast({ title: "Clínica atualizada" });
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-profiles"], ctx.prev);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }),
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any }).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-all-roles"] });
      const prev = queryClient.getQueryData(["admin-all-roles"]);
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["admin-all-roles"], (old: any[]) => [
        ...(old || []),
        { id: tempId, user_id: userId, role },
      ]);
      toast({ title: "Permissão adicionada" });
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-all-roles"], ctx.prev);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] }),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onMutate: async (roleId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-all-roles"] });
      const prev = queryClient.getQueryData(["admin-all-roles"]);
      queryClient.setQueryData(["admin-all-roles"], (old: any[]) =>
        old?.filter((r) => r.id !== roleId)
      );
      toast({ title: "Permissão removida" });
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-all-roles"], ctx.prev);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] }),
  });

  const openEdit = (profile: any) => {
    setEditUser(profile);
    setSelectedClinica(profile.clinica_id || "none");
    setSelectedRole("");
  };

  const handleSaveClinica = () => {
    updateClinicaMutation.mutate({
      profileId: editUser.id,
      clinicaId: selectedClinica === "none" ? null : selectedClinica,
    });
  };

  const handleAddRole = () => {
    if (!selectedRole || !editUser) return;
    addRoleMutation.mutate({ userId: editUser.user_id, role: selectedRole });
    setSelectedRole("");
  };

  const userRoles = editUser ? getUserRoles(editUser.user_id) : [];
  const availableRoles = Object.keys(roleLabels).filter(
    (r) => !userRoles.some((ur) => ur.role === r)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <p className="text-muted-foreground">Gerencie todos os usuários e suas permissões</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando...</p>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const roles = getUserRoles(p.user_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{p.email}</TableCell>
                      <TableCell className="text-muted-foreground">{getClinicaNome(p.clinica_id)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sem permissão</span>
                          ) : (
                            roles.map((r) => (
                              <Badge key={r.id} variant={roleBadgeVariant(r.role)}>
                                {roleLabels[r.role] || r.role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Settings2 className="w-4 h-4" />
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

      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-6">
              <div>
                <p className="font-medium text-foreground">{editUser.nome}</p>
                <p className="text-sm text-muted-foreground">{editUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Clínica vinculada</Label>
                <div className="flex gap-2">
                  <Select value={selectedClinica} onValueChange={setSelectedClinica}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {clinicas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleSaveClinica} disabled={updateClinicaMutation.isPending}>
                    Salvar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permissões</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {userRoles.map((r) => (
                    <Badge key={r.id} variant={roleBadgeVariant(r.role)} className="gap-1 cursor-pointer" onClick={() => {
                      if (confirm(`Remover permissão "${roleLabels[r.role]}"?`)) removeRoleMutation.mutate(r.id);
                    }}>
                      {roleLabels[r.role] || r.role} ×
                    </Badge>
                  ))}
                  {userRoles.length === 0 && <span className="text-sm text-muted-foreground">Sem permissões</span>}
                </div>
                {availableRoles.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Adicionar permissão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddRole} disabled={!selectedRole || addRoleMutation.isPending}>
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsuarios;
