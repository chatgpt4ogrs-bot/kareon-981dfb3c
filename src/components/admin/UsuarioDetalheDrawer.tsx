import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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
import { User, Pencil, Power, Mail, Building2, Briefcase, Shield, X, Save, Check } from "lucide-react";
import { format } from "date-fns";
import type { AppRole } from "@/contexts/AuthContext";
import AcessosPicker from "@/components/admin/AcessosPicker";
import { APP_TABS, resolveTabs, type AppTab } from "@/lib/permissions";
import { invokeManageUser } from "@/lib/manage-user";
import { usePerfis, isStoredPerfilId } from "@/hooks/use-perfis";
import ClinicasMultiPicker from "@/components/admin/ClinicasMultiPicker";

const GLOBAL_ROLES = new Set<string>(["admin", "supervisor_plataforma"]);
const statusLabel: Record<string, string> = { ativo: "Ativo", pendente: "Pendente", inativo: "Inativo" };

interface Props {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UsuarioDetalheDrawer = ({ profileId, open, onOpenChange }: Props) => {
  const { isAdmin, tabs: myTabs } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    role: "" as string,
    perfil_id: "",
    telefone: "",
    clinica_id: "none",
    password: "",
    must_change_password: false,
    permissions: [] as AppTab[],
    gestor_clinica_ids: [] as string[],
  });
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);

  const { perfis, perfilDoUsuario, nomeDoPerfil } = usePerfis();
  const assignablePerfis = isAdmin ? perfis : perfis.filter((p) => !GLOBAL_ROLES.has(p.base_role));
  const grantableTabs: AppTab[] | undefined = isAdmin ? undefined : myTabs;

  const templateFor = (template: AppTab[]): AppTab[] =>
    grantableTabs ? template.filter((t) => grantableTabs.includes(t)) : template;

  useEffect(() => { if (open) { setEditing(false); } }, [open, profileId]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-profile", profileId],
    queryFn: async () => {
      const data = await api<any>(`/profiles/${profileId}`);
      return {
        ...data,
        nome: data.nome || data.name,
        cargo: data.role || data.cargo,
        clinica_id: data.clinic_id || data.clinica_id,
        created_at: data.created_at,
      };
    },
    enabled: !!profileId && open,
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["admin-clinicas", isAdmin],
    queryFn: async () => api<{ id: string; nome: string }[]>("/clinics"),
    enabled: open && isAdmin,
  });

  const isGestorProfile = profile?.cargo === "supervisor_plataforma";
  const { data: gestorClinicIds = [] } = useQuery({
    queryKey: ["gestor-clinicas", profileId],
    queryFn: async () => {
      try {
        return await api<string[]>(`/profiles/${profileId}/gestor-clinicas`);
      } catch {
        return [];
      }
    },
    enabled: !!profileId && open && isAdmin && isGestorProfile,
  });

  const profileRoles = (profile?.cargo ? [profile.cargo] : []) as AppRole[];
  const storedPermissions = Array.isArray((profile as any)?.permissions) ? ((profile as any).permissions as string[]) : null;
  const effectiveTabs = resolveTabs(profileRoles, storedPermissions);

  useEffect(() => {
    if (profile && !editing) setForm({
      nome: profile.nome || "",
      email: profile.email || "",
      role: profile.cargo || "",
      perfil_id: perfilDoUsuario((profile as any).perfil_id, profile.cargo)?.id ?? "",
      telefone: profile.telefone || "",
      clinica_id: profile.clinica_id || "none",
      password: "",
      must_change_password: !!profile.must_change_password,
      permissions: effectiveTabs,
      gestor_clinica_ids: gestorClinicIds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, perfis, gestorClinicIds.join(",")]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const body: Record<string, unknown> = {
        action: "update",
        profile_id: profileId,
      };
      if ("nome" in payload) body.nome = payload.nome;
      if ("telefone" in payload) body.telefone = payload.telefone;
      if ("role" in payload) {
        body.roles = payload.role ? [payload.role] : [];
      }
      if ("perfil_id" in payload && isStoredPerfilId(payload.perfil_id as string)) {
        body.perfil_id = payload.perfil_id;
      }
      if ("permissions" in payload) body.permissions = payload.permissions;
      if ("clinica_id" in payload && isAdmin) {
        body.clinica_id = payload.clinica_id ?? "none";
      }
      if ("gestor_clinica_ids" in payload && isAdmin) {
        body.clinica_ids = payload.gestor_clinica_ids;
      }
      if ("status" in payload) body.status = payload.status;
      if ("must_change_password" in payload) body.must_change_password = payload.must_change_password;
      if ("password" in payload && payload.password) body.password = payload.password;

      await invokeManageUser(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profile", profileId] });
      qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
      qc.invalidateQueries({ queryKey: ["gestor-clinicas", profileId] });
      toast({ title: "Usuário atualizado" });
      setEditing(false);
      setConfirmStatusOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const inativo = profile?.status !== "ativo";
  const clinicaNome = isGestorProfile
    ? (gestorClinicIds.map((id) => clinicas.find((c) => c.id === id)?.nome).filter(Boolean).join(", ") || null)
    : clinicas.find((c) => c.id === profile?.clinica_id)?.nome
      || (profile?.clinica_id ? "Clínica vinculada" : null);

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
                  <span className="text-xs">
                    Cadastrado em{" "}
                    {profile.created_at && !Number.isNaN(new Date(profile.created_at).getTime())
                      ? format(new Date(profile.created_at), "dd/MM/yyyy")
                      : "—"}
                  </span>
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
                const editingGestor = form.role === "supervisor_plataforma";
                if (editingGestor && isAdmin && form.gestor_clinica_ids.length === 0) {
                  toast({ title: "Erro", description: "Vincule o gestor a pelo menos uma clínica", variant: "destructive" });
                  return;
                }
                updateProfileMutation.mutate({
                  ...(editingGestor && isAdmin ? { gestor_clinica_ids: form.gestor_clinica_ids } : {}),
                  nome: form.nome,
                  role: form.role || null,
                  perfil_id: form.perfil_id,
                  ...(form.role !== "admin" ? { permissions: form.permissions } : {}),
                  telefone: form.telefone,
                  clinica_id: form.clinica_id === "none" ? null : form.clinica_id,
                  password: form.password || undefined,
                  must_change_password: form.must_change_password,
                });
              }}
              className="space-y-4"
            >
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><Label>Email</Label><Input value={form.email} disabled /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Perfil</Label>
                  <Select
                    value={form.perfil_id || undefined}
                    onValueChange={(v) => {
                      const perfil = perfis.find((p) => p.id === v);
                      if (!perfil) return;
                      setForm({ ...form, perfil_id: perfil.id, role: perfil.base_role, permissions: templateFor(perfil.abas) });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {assignablePerfis.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              </div>
              {isAdmin && form.role === "supervisor_plataforma" && (
                <div className="space-y-2">
                  <Label>Clínicas do gestor *</Label>
                  <ClinicasMultiPicker
                    clinicas={clinicas}
                    value={form.gestor_clinica_ids}
                    onChange={(gestor_clinica_ids) => setForm({ ...form, gestor_clinica_ids })}
                  />
                </div>
              )}
              {isAdmin && form.role !== "supervisor_plataforma" && (
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
              )}
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="text-sm font-medium">Acessos</h4>
                {form.role === "admin" ? (
                  <p className="text-xs text-muted-foreground">Admin Master tem acesso a todas as abas.</p>
                ) : (
                  <AcessosPicker
                    value={form.permissions}
                    onChange={(permissions) => setForm({ ...form, permissions })}
                    grantable={grantableTabs}
                  />
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 border-t border-border pt-4">
                <h4 className="text-sm font-medium">Segurança e Acesso</h4>
                <div>
                  <Label>Nova senha</Label>
                  <Input type="text" placeholder="Deixe em branco para manter a atual" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="flex items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <Label className="text-sm">Exigir troca de senha</Label>
                    <p className="text-xs text-muted-foreground">Obriga o usuário a mudar a senha no próximo login.</p>
                  </div>
                  <Switch
                    checked={form.must_change_password}
                    onCheckedChange={(v) => setForm({ ...form, must_change_password: v })}
                  />
                </div>
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
                  <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Perfil" value={profile.cargo ? nomeDoPerfil((profile as any).perfil_id, profile.cargo) : null} />
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label={isGestorProfile ? "Clínicas do gestor" : "Clínica"} value={clinicaNome || "Sem clínica vinculada"} />
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Acessos</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {profile.cargo === "admin"
                    ? "Admin Master tem acesso a todas as abas."
                    : storedPermissions === null
                    ? "Usando as abas padrão do perfil. Clique em Editar para personalizar."
                    : "Abas liberadas para este usuário. Clique em Editar para alterar."}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {APP_TABS.map((tab) => {
                    const has = effectiveTabs.includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${has ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}
                      >
                        {has ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4" />}
                        {tab.label}
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