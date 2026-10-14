import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronDown, ChevronRight, Clock, Loader2, UserX } from "lucide-react";
import AcessosPicker from "@/components/admin/AcessosPicker";
import ClinicasMultiPicker from "@/components/admin/ClinicasMultiPicker";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { invokeManageUser } from "@/lib/manage-user";
import { usePerfis, isStoredPerfilId, BASE_ROLE_DESCRIPTIONS } from "@/hooks/use-perfis";
import type { AppTab } from "@/lib/permissions";

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  telefone: string | null;
  role: string | null;
  perfil_id: string | null;
  clinic_id: string | null;
  provider: string;
  email_confirmed: boolean;
  created_at: string;
  has_profile: boolean;
}

interface Props {
  clinicas: { id: string; nome: string }[];
}

const emptyForm = { perfil_id: "", clinica_id: "", gestor_clinica_ids: [] as string[], permissions: [] as AppTab[] };

/** Cadastros em modo visita: ficam aqui até o Admin Master aprovar (vai para a lista normal) ou recusar. */
const UsuariosPendentesPanel = ({ clinicas }: Props) => {
  const qc = useQueryClient();
  const { perfis } = usePerfis();
  const [expanded, setExpanded] = useState(true);
  const [approveTarget, setApproveTarget] = useState<PendingUser | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: pending = [], isLoading, error } = useQuery({
    queryKey: ["usuarios-pendentes"],
    queryFn: async () => {
      const data = await invokeManageUser<{ pending: PendingUser[] }>({ action: "list_pending" });
      return data?.pending ?? [];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const selectedPerfil = perfis.find((p) => p.id === form.perfil_id) ?? null;
  const role = selectedPerfil?.base_role ?? null;
  const isGestor = role === "supervisor_plataforma";
  const isFamiliar = role === "familiar";
  const needsClinic = !!role && role !== "admin" && !isGestor;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
    qc.invalidateQueries({ queryKey: ["admin-usuarios-profiles"] });
  };

  const openApprove = (u: PendingUser) => {
    const perfil = perfis.find((p) => p.id === u.perfil_id)
      ?? perfis.find((p) => p.is_system && p.base_role === u.role)
      ?? null;
    setForm({
      ...emptyForm,
      perfil_id: perfil?.id ?? "",
      clinica_id: u.clinic_id ?? "",
      permissions: perfil?.abas ?? [],
    });
    setApproveTarget(u);
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approveTarget) return;
      if (!selectedPerfil) throw new Error("Selecione um perfil");
      if (isGestor && form.gestor_clinica_ids.length === 0) throw new Error("Vincule o gestor a pelo menos uma clínica");
      if (needsClinic && !form.clinica_id) throw new Error("Escolha a clínica do usuário");
      await invokeManageUser({
        action: "approve",
        user_id: approveTarget.id,
        roles: [selectedPerfil.base_role],
        ...(isStoredPerfilId(selectedPerfil.id) ? { perfil_id: selectedPerfil.id } : {}),
        clinica_id: needsClinic ? form.clinica_id || null : null,
        ...(isGestor ? { clinica_ids: form.gestor_clinica_ids } : {}),
        ...(role !== "admin" ? { permissions: form.permissions } : {}),
      });
    },
    onSuccess: () => {
      toast({ title: "Cadastro aprovado", description: "O usuário já aparece na lista de usuários." });
      setApproveTarget(null);
      refresh();
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await invokeManageUser({ action: "reject", user_id: userId, reason });
    },
    onSuccess: () => {
      toast({ title: "Cadastro recusado" });
      setRejectTarget(null);
      refresh();
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Card className={pending.length > 0 ? "border-amber-500/40" : undefined}>
      <CardHeader className={expanded ? undefined : "pb-6"}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-start gap-2 text-left group"
        >
          {expanded
            ? <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground" />
            : <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground" />}
          <span className="flex-1">
            <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
              <Clock className="w-4 h-4" /> Aguardando aprovação
              {pending.length > 0 && <Badge className="bg-amber-500 hover:bg-amber-500 text-white">{pending.length}</Badge>}
            </CardTitle>
            <span className="block text-xs text-muted-foreground mt-1">
              Contas criadas pelo cadastro do site ou pelo Google. Ficam em modo visita até serem aprovadas.
            </span>
          </span>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="animate-fade-in">
          {isLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <p className="text-sm text-destructive whitespace-pre-line">{(error as Error).message}</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cadastro aguardando aprovação.</p>
          ) : (
            <div className="divide-y divide-border">
              {pending.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}{u.telefone ? ` · ${u.telefone}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {u.provider === "google" ? "Google" : "Cadastro do site"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {format(new Date(u.created_at), "dd/MM/yyyy HH:mm")}
                      </Badge>
                      {!u.email_confirmed && (
                        <Badge variant="secondary" className="text-[10px]">E-mail não confirmado</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="gap-1.5" onClick={() => openApprove(u)}>
                      <Check className="w-3.5 h-3.5" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setRejectTarget(u)}
                    >
                      <UserX className="w-3.5 h-3.5" /> Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}

      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar cadastro</DialogTitle>
            <DialogDescription>
              {approveTarget?.name} ({approveTarget?.email}) sai do modo visita e passa a acessar o sistema com o perfil escolhido.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); approveMutation.mutate(); }}
            className="space-y-3"
          >
            <div>
              <Label>Perfil *</Label>
              <Select
                value={form.perfil_id || undefined}
                onValueChange={(v) => {
                  const perfil = perfis.find((p) => p.id === v);
                  if (!perfil) return;
                  setForm((f) => ({ ...f, perfil_id: perfil.id, permissions: perfil.abas }));
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o perfil do usuário" /></SelectTrigger>
                <SelectContent>
                  {perfis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedPerfil && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPerfil.descricao || BASE_ROLE_DESCRIPTIONS[selectedPerfil.base_role]}
                </p>
              )}
            </div>

            {isGestor && (
              <div className="space-y-2 border-t border-border pt-3">
                <Label>Clínicas do gestor *</Label>
                <ClinicasMultiPicker
                  clinicas={clinicas}
                  value={form.gestor_clinica_ids}
                  onChange={(gestor_clinica_ids) => setForm((f) => ({ ...f, gestor_clinica_ids }))}
                />
              </div>
            )}

            {needsClinic && (
              <div>
                <Label>Clínica *</Label>
                <Select
                  value={form.clinica_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, clinica_id: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a clínica do usuário" /></SelectTrigger>
                  <SelectContent>
                    {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isFamiliar && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                O familiar só visualiza os pacientes vinculados a ele. Sem vínculo, ele não verá nenhum paciente.
              </p>
            )}

            {role && (
              <div className="space-y-2 border-t border-border pt-3">
                <Label>Acessos</Label>
                {role === "admin" ? (
                  <p className="text-xs text-muted-foreground">Admin Master tem acesso a todas as abas.</p>
                ) : (
                  <AcessosPicker
                    value={form.permissions}
                    onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
                  />
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setApproveTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={approveMutation.isPending || !selectedPerfil}>
                {approveMutation.isPending ? "Aprovando..." : "Aprovar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!rejectTarget}
        onOpenChange={(o) => { if (!o) setRejectTarget(null); }}
        title="Recusar cadastro?"
        itemName={rejectTarget?.name}
        description="A conta será excluída e a pessoa não conseguirá mais entrar. O registro fica na Auditoria."
        confirmLabel="Recusar"
        onConfirm={async (reason) => {
          if (rejectTarget) await rejectMutation.mutateAsync({ userId: rejectTarget.id, reason });
        }}
      />
    </Card>
  );
};

export default UsuariosPendentesPanel;
