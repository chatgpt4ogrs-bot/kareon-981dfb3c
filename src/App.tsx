import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/permissions";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Cadastro from "@/pages/Cadastro";
import VerificarEmail from "@/pages/VerificarEmail";
import EsqueciSenha from "@/pages/EsqueciSenha";
import RedefinirSenha from "@/pages/RedefinirSenha";
import AlterarSenha from "@/pages/AlterarSenha";
import Dashboard from "@/pages/Dashboard";
import Pacientes from "@/pages/Pacientes";
import PacienteForm from "@/pages/PacienteForm";
import PacienteDetalhe from "@/pages/PacienteDetalhe";
import SessaoForm from "@/pages/SessaoForm";
import ObjetivoForm from "@/pages/ObjetivoForm";
import Agenda from "@/pages/Agenda";
import Relatorio from "@/pages/Relatorio";
import Cameras from "@/pages/Cameras";
import AdminClinicas from "@/pages/AdminClinicas";
import AdminUsuarios from "@/pages/AdminUsuarios";
import UsuariosClinica from "@/pages/UsuariosClinica";
import AguardandoAprovacao from "@/pages/AguardandoAprovacao";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Carregando...</p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // If profile loaded and status is not ativo (and not admin), show pending page
  if (profile && profile.status !== "ativo") {
    // Check if user is admin (admins bypass approval)
    return <AguardandoAprovacao />;
  }
  return <>{children}</>;
};

const RoleRoute = ({ children }: { children: React.ReactNode }) => {
  const { roles, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!canAccessRoute(roles, location.pathname)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="pacientes" element={<RoleRoute><Pacientes /></RoleRoute>} />
              <Route path="pacientes/novo" element={<RoleRoute><PacienteForm /></RoleRoute>} />
              <Route path="pacientes/:id" element={<RoleRoute><PacienteDetalhe /></RoleRoute>} />
              <Route path="pacientes/:id/editar" element={<RoleRoute><PacienteForm /></RoleRoute>} />
              <Route path="pacientes/:pacienteId/sessao" element={<RoleRoute><SessaoForm /></RoleRoute>} />
              <Route path="pacientes/:pacienteId/objetivo" element={<RoleRoute><ObjetivoForm /></RoleRoute>} />
              <Route path="pacientes/:pacienteId/relatorio" element={<RoleRoute><Relatorio /></RoleRoute>} />
              <Route path="agenda" element={<RoleRoute><Agenda /></RoleRoute>} />
              <Route path="cameras" element={<RoleRoute><Cameras /></RoleRoute>} />
              <Route path="alterar-senha" element={<AlterarSenha />} />
              <Route path="admin/clinicas" element={<AdminRoute><AdminClinicas /></AdminRoute>} />
              <Route path="admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
              <Route path="clinica/usuarios" element={<RoleRoute><UsuariosClinica /></RoleRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
