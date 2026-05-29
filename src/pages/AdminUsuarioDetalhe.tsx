import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, User, Pencil, Power, Mail, Building2, Briefcase, Shield, X } from "lucide-react";
import { format } from "date-fns";

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

const statusLabel: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  inativo: "Inativo",
};

const AdminUsuarioDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cargo: "", telefone: "", clinica_id: "none" });
  const [newRole, setNewRole] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          ...data,
          nome: (data as any).name,
          cargo: data.role,
          clinica_id: (data as any).clinic_id,
        };
      }
      return data;
    },
    enabled: !!id,
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["admin-clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Derive roles locally from profile.role (since user_roles table does not exist)
  const roles = profile?.cargo ? [{ id: "role-id", role: profile.cargo }] : [];

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const dbPayload: any = {};
      if ("nome" in payload) dbPayload.name = payload.nome;
      if ("cargo" in payload) dbPayload.role = payload.cargo;
      if ("telefone" in payload) dbPayload.telefone = payload.telefone;
      if ("clinica_id" in payload) dbPayload.clinic_id = payload.clinica_id;
      if ("status" in payload) dbPayload.status = payload.status;

      const { error } = await supabase.from("profiles").update(dbPayload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Usuário atualizado" });
      setEditOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const addRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile", id] });
      toast({ title: "Permissão adicionada" });
      setNewRole("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("profiles").update({ role: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile", id] });
      toast({ title: "Permissão removida" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openEdit = () => {
    if (!profile) return;
    setForm({
      nome: profile.nome || "",
      email: profile.email || "",
      cargo: profile.cargo || "",
      telefone: profile.telefone || "",
      clinica_id: profile.clinica_id || "none",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    updateProfileMutation.mutate({
      nome: form.nome,
      cargo: form.cargo,
      telefone: form.telefone,
      clinica_id: form.clinica_id === "none" ? null : form.clinica_id,
    });
  };

  const toggleStatus = () => {
    const novoStatus = profile?.status === "ativo" ? "inativo" : "ativo";
    updateProfileMutation.mutate({ status: novoStatus });
    setConfirmStatusOpen(false);
  };

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!profile) return (
    <div className="p-12 text-center space-y-4">
      <User className="w-12 h-12 mx-auto text-muted-foreground/50" />
      <p className="text-muted-foreground">Usuário não encontrado</p>
      <Button variant="outline" onClick={() => navigate("/admin?tab=usuarios")}>Voltar</Button>
    </div>
  );

  const clinicaNome = clinicas.find((c) => c.id === profile.clinica_id)?.nome;
  const inativo = profile.status !== "ativo";
  const availableRoles = Object.keys(roleLabels).filter((r) => !roles.some((ur) => ur.role === r));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin?tab=usuarios")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{profile.nome}</h1>
              <Badge variant={profile.status === "ativo" ? "default" : "secondary"}>
                {statusLabel[profile.status] || profile.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastrado em {format(new Date(profile.created_at), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={openEdit}>
            <Pencil className="w-4 h-4" /> Editar
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setConfirmStatusOpen(true)}>
            <Power className="w-4 h-4" /> {inativo ? "Ativar" : "Desativar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile.email} />
            <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Cargo" value={profile.cargo} />
            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Clínica" value={clinicaNome || "Sem clínica vinculada"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {roles.length === 0 && <span className="text-sm text-muted-foreground">Sem permissões atribuídas</span>}
              {roles.map((r) => (
                <Badge key={r.id} variant={roleBadgeVariant(r.role)} className="gap-1.5 pr-1">
                  {roleLabels[r.role] || r.role}
                  <button
                    className="hover:bg-black/10 rounded p-0.5"
                    onClick={() => { if (confirm(`Remover "${roleLabels[r.role]}"?`)) removeRoleMutation.mutate(r.id); }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {availableRoles.length > 0 && (
              <div className="flex gap-2">
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar permissão..." /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => newRole && addRoleMutation.mutate(newRole)} disabled={!newRole}>
                  Adicionar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><Label>Email</Label><Input value={form.email} disabled /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            </div>
            <div>
              <Label>Clínica</Label>
              <Select value={form.clinica_id} onValueChange={(v) => setForm({ ...form, clinica_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{inativo ? "Ativar usuário?" : "Desativar usuário?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {inativo ? "O usuário poderá acessar o sistema novamente." : "O usuário não poderá mais acessar o sistema, mas os dados serão preservados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggleStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  </div>
);

export default AdminUsuarioDetalhe;