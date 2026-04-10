import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Pacientes from "@/pages/Pacientes";
import PacienteForm from "@/pages/PacienteForm";
import PacienteDetalhe from "@/pages/PacienteDetalhe";
import SessaoForm from "@/pages/SessaoForm";
import ObjetivoForm from "@/pages/ObjetivoForm";
import Agenda from "@/pages/Agenda";
import Relatorio from "@/pages/Relatorio";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
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
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="pacientes" element={<Pacientes />} />
              <Route path="pacientes/novo" element={<PacienteForm />} />
              <Route path="pacientes/:id" element={<PacienteDetalhe />} />
              <Route path="pacientes/:id/editar" element={<PacienteForm />} />
              <Route path="pacientes/:pacienteId/sessao" element={<SessaoForm />} />
              <Route path="pacientes/:pacienteId/objetivo" element={<ObjetivoForm />} />
              <Route path="pacientes/:pacienteId/relatorio" element={<Relatorio />} />
              <Route path="agenda" element={<Agenda />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
