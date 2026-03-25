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
import AdminUsuarios from "@/components/admin/AdminUsuarios";
import LandingPage from "@/pages/LandingPage";

// ... seus imports permanecem iguais

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  // 1. Loading States
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Tratamento de Erro de Registro
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // 3. Componente de Barreira (Refinado)
  const ProtectedRoute = ({ children }) => {
    // Se não houver usuário ou o perfil for pendente, e NÃO for você (SuperUser)
    // Substitua 'seu-email@exemplo.com' pelo seu e-mail real do Google
    const isSuperUser = user?.email === 'seu-email@exemplo.com'; 
    
    if (!user || (user.perfil === "Pendente" && !isSuperUser)) {
      return <Navigate to="/pendente" replace />;
    }
    return children;
  };

  // Componente de Barreira: Só deixa passar se o perfil for Administrador
  const AdminRoute = ({ children }) => {
    if (!user || user.perfil !== "Administrador") {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* 🔓 ROTA PÚBLICA: Landing Page não pode ser bloqueada */}
      <Route path="/landing" element={<LandingPage />} />
      
      {/* Rota de aviso para pendentes */}
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      {/* 🔒 ROTAS PROTEGIDAS */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        
        {/* Painel Admin */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminUsuarios />
          </AdminRoute>
        } />
      </Route>

      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/" replace />} />
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