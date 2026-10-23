import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Power,
  Users,
  Stethoscope,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Tenant = {
  id: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  status: string;
  active: boolean;
  pacientes: number;
  usuarios: number;
  profissionais: number;
  consultas_hoje: number;
  created_at: string;
};

export default function AdminTenants() {
  const { enterTenant, leaveTenant, activeTenantId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    admin_name: "Administrador",
    admin_email: "",
    admin_password: "",
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api<Tenant[]>("/tenants"),
    enabled: isAdmin,
  });

  const createMut = useMutation({
    mutationFn: () => api("/tenants", { method: "POST", json: form }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] });
      toast.success(
        `${res.clinic.nome} criada. Admin: ${res.admin.email} (trocar senha no 1º acesso)`
      );
      setForm({
        nome: "",
        cnpj: "",
        telefone: "",
        admin_name: "Administrador",
        admin_email: "",
        admin_password: "",
      });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas o Superadmin acessa o painel de tenants.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tenants · Clínicas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie as clínicas do sistema. Entre em um tenant para operar como se estivesse
            dentro daquela unidade.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Nova clínica
        </Button>
      </div>

      {activeTenantId && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Você está <strong>dentro de um tenant</strong>. Os dados operacionais ficam filtrados
            nessa clínica.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              leaveTenant();
              toast.message("Saiu do tenant");
            }}
          >
            Sair do tenant
          </Button>
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border bg-card p-5 shadow-soft space-y-4">
          <h3 className="font-semibold">Nova clínica (tenant)</h3>
          <form
            className="grid sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome da clínica</Label>
              <Input
                required
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Clínica Exemplo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ (opcional)</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Administrador da clínica
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do admin</Label>
              <Input
                required
                value={form.admin_name}
                onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail de login</Label>
              <Input
                type="email"
                required
                value={form.admin_email}
                onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
                placeholder="admin@clinica.com"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Senha inicial</Label>
              <Input
                type="password"
                required
                minLength={4}
                value={form.admin_password}
                onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar tenant
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Carregando tenants…
        </div>
      ) : tenants.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma clínica cadastrada</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tenants.map((t) => (
            <li
              key={t.id}
              className={`rounded-2xl border bg-card px-4 py-4 shadow-soft ${
                activeTenantId === t.id ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{t.nome}</p>
                    <Badge variant={t.active ? "default" : "secondary"}>
                      {t.active ? "Ativa" : "Inativa"}
                    </Badge>
                    {activeTenantId === t.id && (
                      <Badge variant="outline" className="border-primary text-primary">
                        Em uso
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criada em {format(new Date(t.created_at), "dd/MM/yyyy")}
                    {t.cnpj ? ` · CNPJ ${t.cnpj}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {t.usuarios} usuários
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> {t.profissionais} profissionais
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {t.pacientes} pacientes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> {t.consultas_hoje} consultas hoje
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === t.id || !t.active}
                    onClick={() => {
                      enterTenant(t.id, t.nome);
                      toast.success(`Entrou em ${t.nome}`);
                      navigate("/");
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    Entrar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === t.id}
                    onClick={async () => {
                      const next = window.prompt("Novo nome da clínica", t.nome);
                      if (!next || next.trim().length < 2 || next.trim() === t.nome) return;
                      setBusyId(t.id);
                      try {
                        await api(`/tenants/${t.id}`, {
                          method: "PUT",
                          json: { nome: next.trim() },
                        });
                        qc.invalidateQueries({ queryKey: ["tenants"] });
                        toast.success("Nome atualizado");
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Renomear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === t.id}
                    onClick={async () => {
                      setBusyId(t.id);
                      try {
                        await api(`/tenants/${t.id}/status`, {
                          method: "PUT",
                          json: { active: !t.active },
                        });
                        if (activeTenantId === t.id && t.active) leaveTenant();
                        qc.invalidateQueries({ queryKey: ["tenants"] });
                        toast.success(t.active ? "Clínica desativada" : "Clínica ativada");
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <Power className="w-4 h-4 mr-1" />
                    {t.active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
