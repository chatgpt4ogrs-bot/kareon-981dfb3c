import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { deleteWithAudit } from "@/lib/audit";
import { ArrowLeft, Building2, Pencil, Power, Users, Trash2, Mail, Phone, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";

const AdminClinicaDetalhe = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin, isPlatformSupervisor, gestorClinicIds } = useAuth();
  const id = paramId || profile?.clinica_id;
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", cnpj: "", telefone: "", email: "", endereco: "" });

  const isCurrentClinic = profile?.clinica_id === id;
  const isGestorClinic = isPlatformSupervisor && !!id && gestorClinicIds.includes(id);
  const canAccess = isAdmin || isCurrentClinic || isGestorClinic;
  const backPath = isAdmin ? "/admin?tab=clinicas" : isPlatformSupervisor ? "/admin/clinicas" : "/";

  const { data: clinica, isLoading } = useQuery({
    queryKey: ["clinica", id],
    queryFn: async () => {
      if (!id) return null;
      return api<any>(`/clinics/${id}`);
    },
    enabled: !!id && canAccess,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["clinica-usuarios", id],
    queryFn: async () => {
      const data = await api<any[]>("/profiles");
      return (data || [])
        .filter((u: any) => u.clinic_id === id || u.clinica_id === id)
        .filter(
          (u: any) =>
            isAdmin ||
            !["admin", "supervisor_plataforma"].includes(String(u.role ?? u.cargo ?? "").toLowerCase())
        )
        .map((u: any) => ({
          ...u,
          nome: u.nome || u.name,
          cargo: u.role || u.cargo,
          clinica_id: u.clinic_id || u.clinica_id,
        }));
    },
    enabled: !!id && canAccess,
  });

  const { data: pacientes = { total: 0 } } = useQuery({
    queryKey: ["clinica-pacientes", id],
    queryFn: async () => {
      const list = await api<any[]>("/pacientes");
      const total = Array.isArray(list)
        ? list.filter((p) => p.clinica_id === id || p.unit_id === id).length
        : 0;
      return { total };
    },
    enabled: !!id && canAccess,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const body = { ...payload };
      if (!isAdmin) delete body.email;
      await api(`/clinics/${id}`, { method: "PUT", json: body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinica", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-clinicas"] });
      toast({ title: "Clínica atualizada" });
      setEditOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!id) throw new Error("Clínica não encontrada");
      await deleteWithAudit("clinica", id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-clinicas"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Clínica excluída" });
      navigate("/admin?tab=clinicas");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openEdit = () => {
    if (!clinica) return;
    setForm({
      nome: clinica.nome || "",
      cnpj: (clinica as any).cnpj || "",
      telefone: (clinica as any).telefone || "",
      email: (clinica as any).email || "",
      endereco: (clinica as any).endereco || "",
    });
    setEditOpen(true);
  };

  const toggleStatus = () => {
    const novoStatus = (clinica as any)?.status === "inativa" ? "ativa" : "inativa";
    updateMutation.mutate({ status: novoStatus });
    setConfirmStatusOpen(false);
  };

  if (!canAccess) {
    return (
      <div className="p-12 text-center space-y-4">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {isPlatformSupervisor
            ? "Acesso negado: esta clínica não está vinculada a você. Se precisar de acesso, entre em contato com o suporte."
            : "Acesso negado: Você só pode visualizar a sua clínica."}
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar para o início</Button>
      </div>
    );
  }

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!clinica) return (
    <div className="p-12 text-center space-y-4">
      <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
      <p className="text-muted-foreground">Clínica não encontrada</p>
      <Button variant="outline" onClick={() => navigate(backPath)}>Voltar</Button>
    </div>
  );

  const status = (clinica as any).status || "ativa";
  const inativa = status === "inativa";
  const cnpjLocked = !!(clinica as any).cnpj;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{clinica.nome}</h1>
              <Badge variant={inativa ? "secondary" : "default"}>
                {inativa ? "Inativa" : "Ativa"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Criada em {format(new Date(clinica.created_at), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={openEdit}>
            <Pencil className="w-4 h-4" /> Editar informações
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" className="gap-2" onClick={() => setConfirmStatusOpen(true)}>
                <Power className="w-4 h-4" /> {inativa ? "Ativar" : "Desativar"}
              </Button>
              <Button variant="destructive" className="gap-2" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="w-4 h-4" /> Excluir
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Usuários</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{usuarios.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pacientes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{(pacientes as any)?.total || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{inativa ? "Inativa" : "Ativa"}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoRow icon={<FileText className="w-4 h-4" />} label="CNPJ" value={(clinica as any).cnpj} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={(clinica as any).telefone} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={(clinica as any).email} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Endereço" value={(clinica as any).endereco} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Usuários vinculados</CardTitle></CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário vinculado a esta clínica</p>
          ) : (
            <div className="divide-y">
              {usuarios.map((u) => (
                <button
                  key={u.id}
                  disabled={!isAdmin}
                  onClick={() => isAdmin && navigate(`/admin/usuarios/${u.id}`)}
                  className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/50 px-2 rounded transition-colors disabled:cursor-default"
                >
                  <div>
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant={u.status === "ativo" ? "default" : "secondary"}>{u.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar clínica</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { cnpj, email, ...rest } = form;
              const payload = {
                ...(cnpjLocked ? rest : { ...rest, cnpj }),
                ...(isAdmin ? { email } : {}),
              };
              updateMutation.mutate(payload);
            }}
            className="space-y-4"
          >
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} disabled={cnpjLocked} />
              {cnpjLocked && <p className="text-xs text-muted-foreground mt-1">O CNPJ não pode ser alterado após o cadastro.{!isAdmin && " Para corrigir, entre em contato com o suporte."}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!isAdmin}
                />
                {isAdmin ? (
                  <p className="text-xs text-amber-700 mt-1">
                    Atenção: este e-mail é usado em comunicações e login da clínica. Altere com cuidado.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Somente o Admin Master pode alterar o e-mail da clínica.
                  </p>
                )}
              </div>
            </div>
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{inativa ? "Ativar clínica?" : "Desativar clínica?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {inativa ? "A clínica voltará a operar normalmente." : "A clínica será marcada como inativa, mas os dados serão preservados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggleStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Excluir clínica?"
        itemName={clinica?.nome}
        description="Esta ação não pode ser desfeita. Todos os dados vinculados podem ser perdidos."
        onConfirm={async (reason) => { await deleteMutation.mutateAsync(reason); }}
      />
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

export default AdminClinicaDetalhe;