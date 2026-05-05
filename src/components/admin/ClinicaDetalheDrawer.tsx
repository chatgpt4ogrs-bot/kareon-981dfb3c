import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Building2, Pencil, Power, Trash2, Save, X, Mail, Phone, MapPin, FileText, Users } from "lucide-react";
import { format } from "date-fns";

interface Props {
  clinicaId: string | null;
  mode: "view" | "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = { nome: "", cnpj: "", telefone: "", email: "", endereco: "" };

const ClinicaDetalheDrawer = ({ clinicaId, mode: initialMode, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(emptyForm);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);

  const { data: clinica, isLoading } = useQuery({
    queryKey: ["clinica", clinicaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("*").eq("id", clinicaId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinicaId && open,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["clinica-usuarios", clinicaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome, email, status").eq("clinica_id", clinicaId!);
      if (error) throw error;
      return data;
    },
    enabled: !!clinicaId && open,
  });

  useEffect(() => {
    if (mode === "create") setForm(emptyForm);
    else if (clinica) setForm({
      nome: clinica.nome || "",
      cnpj: (clinica as any).cnpj || "",
      telefone: (clinica as any).telefone || "",
      email: (clinica as any).email || "",
      endereco: (clinica as any).endereco || "",
    });
  }, [clinica, mode]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        const { error } = await supabase.from("clinicas").insert(form);
        if (error) throw error;
      } else if (clinicaId) {
        const { error } = await supabase.from("clinicas").update(form).eq("id", clinicaId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] });
      qc.invalidateQueries({ queryKey: ["clinica", clinicaId] });
      toast({ title: mode === "create" ? "Clínica criada" : "Clínica atualizada" });
      if (mode === "create") onOpenChange(false);
      else setMode("view");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("clinicas").update({ status }).eq("id", clinicaId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] });
      qc.invalidateQueries({ queryKey: ["clinica", clinicaId] });
      toast({ title: "Status atualizado" });
      setConfirmStatusOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinicas").delete().eq("id", clinicaId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] });
      toast({ title: "Clínica excluída" });
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const status = (clinica as any)?.status || "ativa";
  const inativa = status === "inativa";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">
                {mode === "create" ? "Nova clínica" : clinica?.nome || "Carregando..."}
              </SheetTitle>
              {mode !== "create" && clinica && (
                <SheetDescription className="flex items-center gap-2">
                  <Badge variant={inativa ? "secondary" : "default"} className="text-[10px]">{inativa ? "Inativa" : "Ativa"}</Badge>
                  <span className="text-xs">Criada em {format(new Date(clinica.created_at), "dd/MM/yyyy")}</span>
                </SheetDescription>
              )}
            </div>
          </div>

          {mode === "view" && clinica && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setMode("edit")}><Pencil className="w-3.5 h-3.5" /> Editar</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setConfirmStatusOpen(true)}>
                <Power className="w-3.5 h-3.5" /> {inativa ? "Ativar" : "Desativar"}
              </Button>
              <Button size="sm" variant="destructive" className="gap-2" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {isLoading && mode !== "create" ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : mode === "view" ? (
            <>
              <Card>
                <CardContent className="grid gap-4 md:grid-cols-2 p-4">
                  <InfoRow icon={<FileText className="w-4 h-4" />} label="CNPJ" value={(clinica as any)?.cnpj} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={(clinica as any)?.telefone} />
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={(clinica as any)?.email} />
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Endereço" value={(clinica as any)?.endereco} />
                </CardContent>
              </Card>
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Usuários vinculados ({usuarios.length})</h3>
                {usuarios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum usuário vinculado</p>
                ) : (
                  <div className="border border-border rounded-md divide-y max-h-72 overflow-y-auto">
                    {usuarios.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <Badge variant={u.status === "ativo" ? "default" : "secondary"} className="text-[10px]">{u.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => mode === "create" ? onOpenChange(false) : setMode("view")} className="gap-2">
                  <X className="w-4 h-4" /> Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
                  <Save className="w-4 h-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </div>

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
              <AlertDialogAction onClick={() => updateStatusMutation.mutate(inativa ? "ativa" : "inativa")}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir clínica?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
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

export default ClinicaDetalheDrawer;