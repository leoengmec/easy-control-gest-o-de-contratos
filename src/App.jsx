import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from "@/components/ui/toaster";

// Importações
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from "./Layout";
import Dashboard from "@/pages/Dashboard";
import ExtratoPagamentos from "@/pages/ExtratoPagamentos";
import ContratoDetalhe from "@/pages/ContratoDetalhe";
import Empenhos from "@/pages/Empenhos";
import LandingPage from "@/pages/LandingPage";
import AdminUsuarios from "@/components/admin/AdminUsuarios";

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin, user } = useAuth();
  const SUPER_USER_EMAIL = 'leoengmec@yahoo.com.br';

  // 1. Enquanto carrega, mostra apenas o spinner
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Lógica de Bypass: Se for você, ignoramos o bloqueio
  const isSuperUser = user?.email === SUPER_USER_EMAIL;

  // 3. Se houver erro de falta de login (não está logado na Base44)
  if (authError?.type === 'auth_required' && !isSuperUser) {
    navigateToLogin();
    return null;
  }

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      {/* Rota Raiz: Se for o SuperUser ou não houver erro de registro, entra no Layout */}
      <Route element={
        (isSuperUser || !authError) ? <Layout /> : <Navigate to="/pendente" replace />
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/admin" element={<AdminUsuarios />} />
      </Route>

      {/* Fallback total */}
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