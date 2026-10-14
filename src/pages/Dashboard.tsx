import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminMasterDashboard from "@/components/dashboard/AdminMasterDashboard";
import ClinicAdminDashboard from "@/components/dashboard/ClinicAdminDashboard";
import ResponsavelDashboard from "@/components/dashboard/ResponsavelDashboard";
import TerapeutaDashboard from "@/components/dashboard/TerapeutaDashboard";
import VisitorDashboard from "@/components/dashboard/VisitorDashboard";
import FamiliarDashboard from "@/pages/FamiliarDashboard";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, EyeOff, Users, CalendarDays } from "lucide-react";

const PlatformSupervisorDashboard = () => {
  const { profile, gestorClinicIds } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Gestor";

  const { data: clinicas = [] } = useQuery({
    queryKey: ["gestor-clinicas-dashboard", gestorClinicIds],
    queryFn: async () => {
      if (gestorClinicIds.length === 0) return [];
      const { data, error } = await supabase.from("clinics").select("id, nome").in("id", gestorClinicIds).order("nome");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <EyeOff className="w-3.5 h-3.5" />
          Gestor · oculto
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {gestorClinicIds.length === 0
            ? "Nenhuma clínica está vinculada à sua conta ainda. Entre em contato com o suporte para vincular suas clínicas."
            : `Você faz a gestão de ${gestorClinicIds.length} clínica(s). Sua conta não aparece para os usuários das clínicas.`}
        </p>
        {clinicas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {clinicas.map((c) => (
              <Link key={c.id} to={`/admin/clinicas/${c.id}`} className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-muted">
                {c.nome}
              </Link>
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
    </div>
  );
};

const Dashboard = () => {
  const { isAdmin, isPlatformSupervisor, hasRole, isVisitor } = useAuth();

  if (isVisitor) return <VisitorDashboard />;
  if (isAdmin) return <AdminMasterDashboard />;
  if (isPlatformSupervisor) return <PlatformSupervisorDashboard />;
  if (hasRole("clinica_admin")) return <ClinicAdminDashboard />;
  if (hasRole("responsavel_clinica")) return <ResponsavelDashboard />;
  if (hasRole("familiar")) return <FamiliarDashboard />;
  return <TerapeutaDashboard />;
};

export default Dashboard;
