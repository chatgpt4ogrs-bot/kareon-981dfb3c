import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Building2, Shield, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OpsDashboard from "@/components/dashboard/OpsDashboard";

function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [clinicas, profiles] = await Promise.all([
        api<any[]>("/clinics"),
        api<any[]>("/profiles"),
      ]);
      return {
        clinicas: clinicas.length,
        usuarios: profiles.length,
        recent: profiles
          .slice()
          .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
          .slice(0, 5),
      };
    },
  });
}

const AdminMasterDashboard = () => {
  const { data, isLoading } = useAdminMetrics();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary to-indigo-700 text-primary-foreground p-6 shadow-soft-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/80 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="text-2xl font-bold mt-1">Superadmin · Tenants</h1>
            <p className="text-sm text-white/75 mt-1">
              Visão global das clínicas (tenants), usuários e operação
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm" className="bg-white text-primary hover:bg-white/90">
              <Link to="/admin?tab=tenants">
                <Building2 className="w-4 h-4 mr-1" /> Tenants
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10">
              <Link to="/admin/usuarios">
                <Users className="w-4 h-4 mr-1" /> Usuários
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3">
            <p className="text-xs text-white/70">Clínicas</p>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? "…" : data?.clinicas ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3">
            <p className="text-xs text-white/70">Usuários</p>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? "…" : data?.usuarios ?? 0}
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-soft border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm">Usuários recentes</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/usuarios">Ver todos</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Carregando…
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.recent || []).map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.nome || u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="font-normal capitalize shrink-0">
                    {u.role || u.cargo || "—"}
                  </Badge>
                </div>
              ))}
              {(data?.recent || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <OpsDashboard />
    </div>
  );
};

export default AdminMasterDashboard;
