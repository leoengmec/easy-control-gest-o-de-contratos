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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  // BARREIRA 1: Protege contra usuários que logaram mas não foram aprovados (Perfil Pendente)
  const ProtectedRoute = ({ children }) => {
    if (!user || user.perfil === "Pendente") {
      return <Navigate to="/pendente" replace />;
    }
    return children;
  };

  // BARREIRA 2: Só deixa passar se o perfil for Administrador
  const AdminRoute = ({ children }) => {
    if (!user || user.perfil !== "Administrador") {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Rota para usuários que ainda não tiveram o acesso liberado */}
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      {/* Todas as rotas abaixo do Layout agora estão protegidas pela ProtectedRoute */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/contratos/:id/aditivos" element={<ContratoDetalhe tab="aditivos" />} />
        <Route path="/contratos/:id/empenhos" element={<ContratoDetalhe tab="empenhos" />} />
        
        <Route path="/empenhos" element={<Empenhos />} />

        <Route path="/admin" element={
          <AdminRoute>
            <AdminUsuarios />
          </AdminRoute>
        } />

        {/* Fallbacks para itens do menu não implementados */}
        <Route path="/contratos" element={<Navigate to="/" replace />} />
        <Route path="/relatorios" element={<Navigate to="/" replace />} />
      </Route>

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