import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/permissions";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";
import AguardandoAprovacao from "@/pages/AguardandoAprovacao";
import SensitiveAreaGuard from "@/components/SensitiveAreaGuard";

const Login = lazy(() => import("@/pages/Login"));
const Cadastro = lazy(() => import("@/pages/Cadastro"));
const VerificarEmail = lazy(() => import("@/pages/VerificarEmail"));
const EsqueciSenha = lazy(() => import("@/pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("@/pages/RedefinirSenha"));
const AlterarSenha = lazy(() => import("@/pages/AlterarSenha"));
const TermosServico = lazy(() => import("@/pages/TermosServico"));
const PoliticaPrivacidade = lazy(() => import("@/pages/PoliticaPrivacidade"));
const AvisoSaude = lazy(() => import("@/pages/AvisoSaude"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pacientes = lazy(() => import("@/pages/Pacientes"));
const PacienteForm = lazy(() => import("@/pages/PacienteForm"));
const PacienteDetalhe = lazy(() => import("@/pages/PacienteDetalhe"));
const SessaoForm = lazy(() => import("@/pages/SessaoForm"));
const ObjetivoForm = lazy(() => import("@/pages/ObjetivoForm"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const Relatorio = lazy(() => import("@/pages/Relatorio"));
const Cameras = lazy(() => import("@/pages/Cameras"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const AdminClinicas = lazy(() => import("@/pages/AdminClinicas"));
const AdminUsuarios = lazy(() => import("@/pages/AdminUsuarios"));
const PainelAdministrativo = lazy(() => import("@/pages/PainelAdministrativo"));
const AdminClinicaDetalhe = lazy(() => import("@/pages/AdminClinicaDetalhe"));
const AdminUsuarioDetalhe = lazy(() => import("@/pages/AdminUsuarioDetalhe"));
const UsuariosClinica = lazy(() => import("@/pages/UsuariosClinica"));
const NotFound = lazy(() => import("@/pages/NotFound"));
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos — evita refetch ao voltar para uma página
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Carregando...</p>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Admins bypass approval; pending/blocked users see waiting screen
  if (profile && profile.status !== "ativo" && !isAdmin) {
    return <AguardandoAprovacao />;
  }
  return <>{children}</>;
}

function RoleRoute({ children }: { children: React.ReactNode }) {
  const { roles, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!canAccessRoute(roles, location.pathname)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/termos-de-servico" element={<TermosServico />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/aviso-de-saude" element={<AvisoSaude />} />
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
              <Route path="cameras" element={<RoleRoute><SensitiveAreaGuard area="cameras"><Cameras /></SensitiveAreaGuard></RoleRoute>} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="alterar-senha" element={<AlterarSenha />} />
              <Route path="admin" element={<AdminRoute><SensitiveAreaGuard area="admin"><PainelAdministrativo /></SensitiveAreaGuard></AdminRoute>} />
              <Route path="admin/clinicas" element={<AdminRoute><SensitiveAreaGuard area="admin"><AdminClinicas /></SensitiveAreaGuard></AdminRoute>} />
              <Route path="admin/clinicas/:id" element={<AdminRoute><SensitiveAreaGuard area="admin"><AdminClinicaDetalhe /></SensitiveAreaGuard></AdminRoute>} />
              <Route path="admin/usuarios" element={<AdminRoute><SensitiveAreaGuard area="admin"><AdminUsuarios /></SensitiveAreaGuard></AdminRoute>} />
              <Route path="admin/usuarios/:id" element={<AdminRoute><SensitiveAreaGuard area="admin"><AdminUsuarioDetalhe /></SensitiveAreaGuard></AdminRoute>} />
              <Route path="clinica/usuarios" element={<RoleRoute><UsuariosClinica /></RoleRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
