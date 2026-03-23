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

// Importaremos a nova tela de Admin (que criaremos nos próximos passos)
import AdminUsuarios from "@/pages/AdminUsuarios";

const AuthenticatedApp = () => {
  // Adicionamos a extração do 'user' atual do nosso contexto de autenticação
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

  // Componente de Barreira: Só deixa passar se o perfil for Administrador
  const AdminRoute = ({ children }) => {
    // Caso o usuário não tenha o perfil Administrador, ele é chutado de volta pra Home
    if (!user || user.perfil !== "Administrador") {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Dashboard - Gestão Inteligente */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Extrato - Controle Financeiro */}
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        
        {/* Fiscalização Contratual - Rotas Dinâmicas */}
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/contratos/:id/aditivos" element={<ContratoDetalhe tab="aditivos" />} />
        <Route path="/contratos/:id/empenhos" element={<ContratoDetalhe tab="empenhos" />} />
        
        <Route path="/empenhos" element={<Empenhos />} />

        {/* NOVA ROTA: Painel Administrativo (Protegida) */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminUsuarios />
          </AdminRoute>
        } />

        {/* Rotas de fallback para itens do menu ainda não implementados */}
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