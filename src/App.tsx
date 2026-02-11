import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AgendaPage from "./pages/AgendaPage";
import PacientesPage from "./pages/PacientesPage";
import PatientDetailsPage from "./pages/PatientDetailsPage";
import ClinicasPage from "./pages/ClinicasPage";
import EspecialidadesPage from "./pages/EspecialidadesPage";
import EmpresasPage from "./pages/EmpresasPage";
import RelatorioPage from "./pages/RelatorioPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
            <Route path="/pacientes" element={<ProtectedRoute><PacientesPage /></ProtectedRoute>} />
            <Route path="/pacientes/:id" element={<ProtectedRoute><PatientDetailsPage /></ProtectedRoute>} />
            <Route path="/clinicas" element={<ProtectedRoute><ClinicasPage /></ProtectedRoute>} />
            <Route path="/especialidades" element={<ProtectedRoute><EspecialidadesPage /></ProtectedRoute>} />
            <Route path="/empresas" element={<ProtectedRoute><EmpresasPage /></ProtectedRoute>} />
            <Route path="/relatorio" element={<ProtectedRoute><RelatorioPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanelPage /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
