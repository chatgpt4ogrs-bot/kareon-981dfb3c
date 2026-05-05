import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { User, Pencil, Power, Mail, Building2, Briefcase, Shield, X, Save } from "lucide-react";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  admin: "Admin Master",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Terapeuta",
  familiar: "Familiar",
};
const roleBadgeVariant = (role: string) => role === "admin" ? "destructive" as const : role === "clinica_admin" ? "default" as const : "secondary" as const;
const statusLabel: Record<string, string> = { ativo: "Ativo", pendente: "Pendente", inativo: "Inativo" };

interface Props {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UsuarioDetalheDrawer = ({ profileId, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cargo: "", clinica_id: "none" });
  const [newRole, setNewRole] = useState("");
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);

  useEffect(() => { if (open) { setEditing(false); setNewRole(""); } }, [open, profileId]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-profile", profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", profileId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId && open,
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["admin-clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["user-roles", profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*").eq("user_id", profile!.user_id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && open,
  });

  useEffect(() => {
    if (profile) setForm({
      nome: profile.nome || "",
      email: profile.email || "",
      cargo: profile.cargo || "",
      clinica_id: profile.clinica_id || "none",
    });
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("profiles").update(payload).eq("id", profileId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profile", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
      toast({ title: "Usuário atualizado" });
      setEditing(false);
      setConfirmStatusOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const addRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: profile!.user_id, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-roles", profile?.user_id] });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-roles"] });
      toast({ title: "Permissão adicionada" });
      setNewRole("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-roles", profile?.user_id] });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-roles"] });
      toast({ title: "Permissão removida" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const inativo = profile?.status !== "ativo";
  const clinicaNome = clinicas.find((c) => c.id === profile?.clinica_id)?.nome;
  const availableRoles = Object.keys(roleLabels).filter((r) => !roles.some((ur) => ur.role === r));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{profile?.nome || "Carregando..."}</SheetTitle>
              {profile && (
                <SheetDescription className="flex items-center gap-2">
                  <Badge variant={profile.status === "ativo" ? "default" : "secondary"} className="text-[10px]">
                    {statusLabel[profile.status] || profile.status}
                  </Badge>
                  <span className="text-xs">Cadastrado em {format(new Date(profile.created_at), "dd/MM/yyyy")}</span>
                </SheetDescription>
              )}
            </div>
          </div>

          {profile && !editing && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /> Editar</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setConfirmStatusOpen(true)}>
                <Power className="w-3.5 h-3.5" /> {inativo ? "Ativar" : "Desativar"}
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !profile ? null : editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate({ nome: form.nome, cargo: form.cargo, clinica_id: form.clinica_id === "none" ? null : form.clinica_id });
              }}
              className="space-y-4"
            >
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><Label>Email</Label><Input value={form.email} disabled /></div>
              <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => setEditing(false)}><X className="w-4 h-4" /> Cancelar</Button>
                <Button type="submit" className="gap-2" disabled={updateProfileMutation.isPending}>
                  <Save className="w-4 h-4" /> Salvar
                </Button>
              </div>
            </form>
          ) : (
            <>
              <Card>
                <CardContent className="space-y-4 p-4">
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile.email} />
                  <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Cargo" value={profile.cargo} />
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="Clínica" value={clinicaNome || "Sem clínica vinculada"} />
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Permissões</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {roles.length === 0 && <span className="text-xs text-muted-foreground">Sem permissões atribuídas</span>}
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
                    <Button onClick={() => newRole && addRoleMutation.mutate(newRole)} disabled={!newRole}>Adicionar</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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
              <AlertDialogAction onClick={() => updateProfileMutation.mutate({ status: inativo ? "ativo" : "inativo" })}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
    </div>
  </div>
);

export default UsuarioDetalheDrawer;