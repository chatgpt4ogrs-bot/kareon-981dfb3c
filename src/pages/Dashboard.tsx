import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import AdminMasterDashboard from "@/components/dashboard/AdminMasterDashboard";
import OpsDashboard from "@/components/dashboard/OpsDashboard";
import VisitorDashboard from "@/components/dashboard/VisitorDashboard";
import FamiliarDashboard from "@/pages/FamiliarDashboard";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, EyeOff, Users, CalendarDays } from "lucide-react";

const PlatformSupervisorDashboard = () => {
  const { profile, gestorClinicIds, enterTenant, activeTenantId, activeTenantName } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Gestor";

  const { data: clinicas = [] } = useQuery({
    queryKey: ["gestor-clinicas-dashboard", gestorClinicIds],
    queryFn: async () => {
      if (gestorClinicIds.length === 0) return [];
      const all = await api<{ id: string; nome: string }[]>("/clinics");
      return all.filter((c) => gestorClinicIds.includes(c.id));
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <EyeOff className="w-3.5 h-3.5" />
          Gestor · oculto
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {gestorClinicIds.length === 0
            ? "Nenhuma clínica está vinculada à sua conta ainda. Entre em contato com o suporte para vincular suas clínicas."
            : activeTenantName
              ? `Unidade ativa: ${activeTenantName}. Você gerencia ${gestorClinicIds.length} clínica(s).`
              : `Você faz a gestão de ${gestorClinicIds.length} clínica(s). Escolha uma unidade abaixo para operar.`}
        </p>
        {clinicas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {clinicas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => enterTenant(c.id, c.nome)}
                className={`text-xs rounded-full border px-2.5 py-1 hover:bg-muted ${
                  activeTenantId === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border"
                }`}
              >
                {c.nome}
                {activeTenantId === c.id ? " · ativa" : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="shadow-none">
          <CardContent className="pt-5 pb-5 space-y-3">
            <Building2 className="w-5 h-5 text-primary" />
            <p className="font-medium text-sm">Minhas clínicas</p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/admin/clinicas">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-5 pb-5 space-y-3">
            <Users className="w-5 h-5 text-primary" />
            <p className="font-medium text-sm">Pacientes</p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/pacientes">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-5 pb-5 space-y-3">
            <CalendarDays className="w-5 h-5 text-primary" />
            <p className="font-medium text-sm">Agenda</p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/agenda">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="pt-2">
        <OpsDashboard />
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { isAdmin, isPlatformSupervisor, hasRole, isVisitor } = useAuth();

  if (isVisitor) return <VisitorDashboard />;
  if (isAdmin) return <AdminMasterDashboard />;
  if (isPlatformSupervisor) return <PlatformSupervisorDashboard />;
  if (hasRole("familiar")) return <FamiliarDashboard />;
  return <OpsDashboard />;
};

export default Dashboard;
