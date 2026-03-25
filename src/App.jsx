import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from "./Layout";
import Dashboard from "@/pages/Dashboard";
import ExtratoPagamentos from "@/pages/ExtratoPagamentos";
import ContratoDetalhe from "@/pages/ContratoDetalhe";
import Empenhos from "@/pages/Empenhos";
import LandingPage from "@/pages/LandingPage"; 
import AdminUsuarios from "@/components/admin/AdminUsuarios";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const SUPER_USER_EMAIL = 'leoengmec@yahoo.com.br';

  // 1. Enquanto carrega, mostra o spinner
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Verificação de Super Usuário (Bypass)
  // Se o e-mail bater OU se não houver erro, deixamos passar para o teste
  const isSuperUser = user?.email === SUPER_USER_EMAIL;

  // 3. Só bloqueamos se NÃO for o super usuário E houver um erro real
  if (authError && !isSuperUser) {
    // Se o erro for falta de login, manda pro login da Base44
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
    // Se for apenas erro de registro, mas você é o dono, deixamos passar abaixo
    if (authError.type === 'user_not_registered' && !isSuperUser) {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/landing" element={<LandingPage />} />
      
      {/* Tela de Pendente (Apenas para outros usuários) */}
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      {/* Rota Protegida com Bypass para você */}
      <Route element={
        <ProtectedRoute isSuperUser={isSuperUser} user={user}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/admin" element={<AdminUsuarios />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Componente de Barreira simplificado para o seu acesso
const ProtectedRoute = ({ children, isSuperUser, user }) => {
  // Se for você, entra direto. Se não for e for pendente, barra.
  if (isSuperUser) return children;
  
  if (!user || user.perfil === "Pendente") {
    return <Navigate to="/pendente" replace />;
  }
  return children;
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