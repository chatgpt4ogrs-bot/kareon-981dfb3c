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
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { User, Pencil, Power, Mail, Building2, Briefcase, Shield, X, Save } from "lucide-react";
import { format } from "date-fns";

const ALL_ROLES = ["admin", "clinica_admin", "responsavel_clinica", "terapeuta", "familiar"] as const;
const roleLabels: Record<string, string> = {
  admin: "Admin Master",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Terapeuta",
  familiar: "Familiar",
};
const roleDescriptions: Record<string, string> = {
  admin: "Acesso total ao sistema, todas as clínicas.",
  clinica_admin: "Gerencia configurações, usuários e dados da clínica.",
  responsavel_clinica: "Gestão operacional (pacientes, agenda, câmeras).",
  terapeuta: "Atende pacientes, registra sessões e objetivos.",
  familiar: "Visualiza informações e câmeras dos pacientes vinculados.",
};
const statusLabel: Record<string, string> = { ativo: "Ativo", pendente: "Pendente", inativo: "Inativo" };

interface Props {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UsuarioDetalheDrawer = ({ profileId, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cargo: "", telefone: "", clinica_id: "none" });
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);

  useEffect(() => { if (open) { setEditing(false); } }, [open, profileId]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-profile", profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", profileId!).maybeSingle();
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

  // Derive roles locally from profile.role (since user_roles table does not exist)
  const roles = profile?.cargo ? [{ id: "role-id", role: profile.cargo }] : [];

  useEffect(() => {
    if (profile) setForm({
      nome: profile.nome || "",
      email: profile.email || "",
      cargo: profile.cargo || "",
      telefone: profile.telefone || "",
      clinica_id: profile.clinica_id || "none",
    });
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Map form payload back to real database columns
      const dbPayload: any = {};
      if ("nome" in payload) dbPayload.name = payload.nome;
      if ("cargo" in payload) dbPayload.role = payload.cargo;
      if ("telefone" in payload) dbPayload.telefone = payload.telefone;
      if ("clinica_id" in payload) dbPayload.clinic_id = payload.clinica_id;
      if ("status" in payload) dbPayload.status = payload.status;
      if ("role" in payload) dbPayload.role = payload.role;

      const { error } = await supabase.from("profiles").update(dbPayload).eq("id", profileId!);
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

  const inativo = profile?.status !== "ativo";
  const clinicaNome = clinicas.find((c) => c.id === profile?.clinica_id)?.nome;

  const toggleRole = (role: string, has: boolean) => {
    updateProfileMutation.mutate({ role: has ? null : role });
  };

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
                updateProfileMutation.mutate({ nome: form.nome, cargo: form.cargo, telefone: form.telefone, clinica_id: form.clinica_id === "none" ? null : form.clinica_id });
              }}
              className="space-y-4"
            >
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
                <p className="text-xs text-muted-foreground mb-3">Ative ou desative as funções deste usuário. As alterações são salvas automaticamente.</p>
                <div className="space-y-2">
                  {ALL_ROLES.map((r) => {
                    const has = roles.some((ur) => ur.role === r);
                    const busy = addRoleMutation.isPending || removeRoleMutation.isPending;
                    return (
                      <div
                        key={r}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${has ? "border-primary/40 bg-primary/5" : "border-border bg-background hover:bg-muted/40"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{roleLabels[r]}</span>
                            {has && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Ativa</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{roleDescriptions[r]}</p>
                        </div>
                        <Switch
                          checked={has}
                          disabled={busy}
                          onCheckedChange={() => toggleRole(r, has)}
                        />
                      </div>
                    );
                  })}
                </div>
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