import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [clinicas, profiles] = await Promise.all([
        supabase.from("clinicas").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        clinicas: clinicas.count ?? 0,
        usuarios: profiles.count ?? 0,
      };
    },
  });
}

function useRecentUsers() {
  return useQuery({
    queryKey: ["recent-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, email, cargo, status, clinica_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      const userIds = (data || []).map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      // Fetch clinic names
      const clinicaIds = [...new Set((data || []).map((p) => p.clinica_id).filter(Boolean))];
      const { data: clinicas } = clinicaIds.length > 0
        ? await supabase.from("clinicas").select("id, nome").in("id", clinicaIds)
        : { data: [] };
      const clinicaMap: Record<string, string> = {};
      (clinicas || []).forEach((c: any) => { clinicaMap[c.id] = c.nome; });

      return (data || []).map((p) => ({
        ...p,
        roles: roleMap[p.user_id] || [],
        clinica_nome: p.clinica_id ? clinicaMap[p.clinica_id] || "—" : "—",
      }));
    },
  });
}

const roleLabels: Record<string, string> = {
  admin: "Admin Master",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Terapeuta",
  familiar: "Familiar",
};

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700",
  pendente: "bg-yellow-500/10 text-yellow-700",
  bloqueado: "bg-red-500/10 text-red-700",
};

const AdminMasterDashboard = () => {
  const { data: metrics } = useAdminMetrics();
  const { data: recentUsers = [], isLoading } = useRecentUsers();
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const stats = [
    { label: "Clínicas", value: metrics?.clinicas ?? 0, icon: Building2, color: "text-primary" },
    { label: "Usuários", value: metrics?.usuarios ?? 0, icon: Shield, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo 🛡️</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-semibold text-foreground mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                  <stat.icon className={cn("w-[18px] h-[18px]", stat.color)} strokeWidth={1.85} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-2">
                {recentUsers.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {u.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", statusColors[u.status])}>
                      {u.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acesso rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/clinicas">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Building2 className="w-4 h-4" /> Gerenciar clínicas
              </Button>
            </Link>
            <Link to="/admin/usuarios">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Shield className="w-4 h-4" /> Gerenciar usuários
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {selectedUser.nome.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{selectedUser.nome}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn("mt-1", statusColors[selectedUser.status])}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="text-sm text-foreground mt-1">{selectedUser.cargo || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clínica</p>
                  <p className="text-sm text-foreground mt-1">{selectedUser.clinica_nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perfis</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUser.roles.length > 0 ? selectedUser.roles.map((r: string) => (
                      <Badge key={r} variant="secondary" className="text-xs">{roleLabels[r] || r}</Badge>
                    )) : <span className="text-sm text-muted-foreground">Sem perfil</span>}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm text-foreground mt-1">
                  {format(new Date(selectedUser.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMasterDashboard;
