import { useAuth } from "@/contexts/AuthContext";
import AdminMasterDashboard from "@/components/dashboard/AdminMasterDashboard";
import ClinicAdminDashboard from "@/components/dashboard/ClinicAdminDashboard";
import ResponsavelDashboard from "@/components/dashboard/ResponsavelDashboard";
import TerapeutaDashboard from "@/components/dashboard/TerapeutaDashboard";
import FamiliarDashboard from "@/pages/FamiliarDashboard";

const Dashboard = () => {
  const { isAdmin, hasRole } = useAuth();

  if (isAdmin) return <AdminMasterDashboard />;
  if (hasRole("clinica_admin")) return <ClinicAdminDashboard />;
  if (hasRole("responsavel_clinica")) return <ResponsavelDashboard />;
  if (hasRole("familiar")) return <FamiliarDashboard />;
  return <TerapeutaDashboard />;
};

export default Dashboard;
