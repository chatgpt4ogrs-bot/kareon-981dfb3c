import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/permissions";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense, useEffect, useState } from "react";
import AguardandoAprovacao from "@/pages/AguardandoAprovacao";
import SensitiveAreaGuard from "@/components/SensitiveAreaGuard";
import SetupBanco from "@/pages/SetupBanco";
import { setupApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
const Estoque = lazy(() => import("@/pages/Estoque"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const AdminClinicas = lazy(() => import("@/pages/AdminClinicas"));
const AdminUsuarios = lazy(() => import("@/pages/AdminUsuarios"));
const PainelAdministrativo = lazy(() => import("@/pages/PainelAdministrativo"));
const AdminClinicaDetalhe = lazy(() => import("@/pages/AdminClinicaDetalhe"));
const AdminUsuarioDetalhe = lazy(() => import("@/pages/AdminUsuarioDetalhe"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AtendimentoLista = lazy(() => import("@/pages/AtendimentoLista"));
const AtendimentoForm = lazy(() => import("@/pages/AtendimentoForm"));
const AtendimentoClinico = lazy(() => import("@/pages/AtendimentoClinico"));
const Recepcao = lazy(() => import("@/pages/Recepcao"));
const SalaEspera = lazy(() => import("@/pages/SalaEspera"));
const AgendaClinica = lazy(() => import("@/pages/AgendaClinica"));
const Profissionais = lazy(() => import("@/pages/Profissionais"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Documentos = lazy(() => import("@/pages/Documentos"));
const CadastrosClinica = lazy(() => import("@/pages/CadastrosClinica"));
const ListaEspera = lazy(() => import("@/pages/ListaEspera"));
const PainelTV = lazy(() => import("@/pages/PainelTV"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
    <img
      src="/brand/kareon-mark.png"
      alt="Kareon"
      className="w-14 h-14 object-contain"
    />
    <Loader2 className="w-5 h-5 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Carregando Kareon…</p>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, rolesLoaded, isVisitor, isBlocked } = useAuth();
  const location = useLocation();
  if (loading || (user && !rolesLoaded)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isBlocked) {
    return <AguardandoAprovacao variant="blocked" />;
  }
  if (!isVisitor && profile?.must_change_password && location.pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" replace />;
  }
  return <>{children}</>;
}

function RoleRoute({ children }: { children: React.ReactNode }) {
  const { roles, tabs, loading, rolesLoaded, isVisitor } = useAuth();
  const location = useLocation();
  if (loading || !rolesLoaded) return <LoadingScreen />;
  if (!canAccessRoute(roles, location.pathname, isVisitor, tabs)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, rolesLoaded } = useAuth();
  if (loading || !rolesLoaded) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GlobalClinicsRoute({ children }: { children: React.ReactNode }) {
  const { canViewAllClinics, loading, rolesLoaded } = useAuth();
  if (loading || !rolesLoaded) return <LoadingScreen />;
  if (!canViewAllClinics) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
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
        <Route path="/painel-tv" element={<PainelTV />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="pacientes" element={<RoleRoute><Pacientes /></RoleRoute>} />
          <Route path="pacientes/novo" element={<PacienteForm />} />
          <Route path="pacientes/:id/editar" element={<PacienteForm />} />
          <Route path="pacientes/:id" element={<RoleRoute><PacienteDetalhe /></RoleRoute>} />
          <Route path="pacientes/:pacienteId/sessao" element={<RoleRoute><SessaoForm /></RoleRoute>} />
          <Route path="pacientes/:pacienteId/objetivo" element={<RoleRoute><ObjetivoForm /></RoleRoute>} />
          <Route path="pacientes/:pacienteId/relatorio" element={<RoleRoute><Relatorio /></RoleRoute>} />
              <Route path="agenda" element={<RoleRoute><AgendaClinica /></RoleRoute>} />
              <Route path="agenda-terapeutica" element={<RoleRoute><Agenda /></RoleRoute>} />
              <Route path="recepcao" element={<RoleRoute><Recepcao /></RoleRoute>} />
              <Route path="sala-espera" element={<RoleRoute><SalaEspera /></RoleRoute>} />
              <Route path="lista-espera" element={<RoleRoute><ListaEspera /></RoleRoute>} />
              <Route path="atendimento" element={<RoleRoute><AtendimentoLista /></RoleRoute>} />
              <Route path="atendimento/novo" element={<RoleRoute><AtendimentoForm /></RoleRoute>} />
              <Route path="atendimento/clinico/:id" element={<RoleRoute><AtendimentoClinico /></RoleRoute>} />
              <Route path="atendimento/:id" element={<RoleRoute><AtendimentoForm /></RoleRoute>} />
              <Route path="documentos" element={<RoleRoute><Documentos /></RoleRoute>} />
              <Route path="financeiro" element={<RoleRoute><Financeiro /></RoleRoute>} />
              <Route path="profissionais" element={<RoleRoute><Profissionais /></RoleRoute>} />
              <Route path="cadastros" element={<RoleRoute><CadastrosClinica /></RoleRoute>} />
          <Route path="estoque" element={<RoleRoute><Estoque /></RoleRoute>} />
          <Route path="cameras" element={<RoleRoute><SensitiveAreaGuard area="cameras"><Cameras /></SensitiveAreaGuard></RoleRoute>} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="admin" element={<AdminRoute><SensitiveAreaGuard area="admin"><PainelAdministrativo /></SensitiveAreaGuard></AdminRoute>} />
          <Route path="admin/clinicas" element={<GlobalClinicsRoute><SensitiveAreaGuard area="admin"><AdminClinicas /></SensitiveAreaGuard></GlobalClinicsRoute>} />
          <Route path="admin/clinicas/:id" element={<GlobalClinicsRoute><SensitiveAreaGuard area="admin"><AdminClinicaDetalhe /></SensitiveAreaGuard></GlobalClinicsRoute>} />
          <Route path="admin/usuarios" element={<AdminRoute><SensitiveAreaGuard area="admin"><AdminUsuarios /></SensitiveAreaGuard></AdminRoute>} />
          <Route path="admin/usuarios/:id" element={<AdminRoute><SensitiveAreaGuard area="admin"><AdminUsuarioDetalhe /></SensitiveAreaGuard></AdminRoute>} />
          <Route path="clinica/usuarios" element={<RoleRoute><AdminUsuarios /></RoleRoute>} />
          <Route path="clinica/detalhes" element={<RoleRoute><AdminClinicaDetalhe /></RoleRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function Bootstrap() {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [apiDown, setApiDown] = useState(false);

  const check = () => {
    setChecking(true);
    setApiDown(false);
    setupApi
      .status()
      .then((s) => setConfigured(s.configured))
      .catch(() => setApiDown(true))
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    check();
  }, []);

  if (checking) return <LoadingScreen />;

  if (apiDown) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-medium">API não está respondendo</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Inicie o backend com <code className="bg-muted px-1 rounded">npm run server</code> (porta
          3001) e depois o frontend.
        </p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={check}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!configured) {
    return <SetupBanco onConfigured={check} />;
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Bootstrap />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
