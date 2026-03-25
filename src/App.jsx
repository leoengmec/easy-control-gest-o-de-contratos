import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from "@/components/ui/toaster";

// Componentes e Páginas
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from "./Layout";
import Dashboard from "@/pages/Dashboard";
import ExtratoPagamentos from "@/pages/ExtratoPagamentos";
import ContratoDetalhe from "@/pages/ContratoDetalhe";
import Empenhos from "@/pages/Empenhos";
import LandingPage from "@/pages/LandingPage"; // ✅ Importação corrigida
import AdminUsuarios from "@/components/admin/AdminUsuarios";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  
  // 🔴 SEU E-MAIL DE ACESSO
  const SUPER_USER_EMAIL = 'leoengmec@yahoo.com.br';

  // 1. Splash Screen de Carregamento
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
          <span className="text-slate-500 font-medium text-sm">Autenticando...</span>
        </div>
      </div>
    );
  }

  // 2. Lógica de Bypass para o Leonardo
  const isSuperUser = user?.email === SUPER_USER_EMAIL;

  // 3. Tratamento de Erros de Autenticação
  if (authError && !isSuperUser) {
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
    // Usuários comuns caem aqui se não estiverem no banco
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // 4. Componente de Barreira Interno
  const ProtectedRoute = ({ children }) => {
    // Se for o Leonardo, passa sempre. Se for outro e estiver pendente, barra.
    if (isSuperUser) return children;
    
    if (!user || user.perfil === "Pendente") {
      return <Navigate to="/pendente" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      {/* Estrutura Protegida (com Bypass para SuperUser) */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/admin" element={<AdminUsuarios />} />
      </Route>

      {/* Redirecionamento Inteligente */}
      <Route path="*" element={<Navigate to={user ? "/" : "/landing"} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}