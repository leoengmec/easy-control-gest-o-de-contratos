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

  // 🔴 COLOQUE SEU E-MAIL AQUI PARA LIBERAR O ACESSO
  const SUPER_USER_EMAIL = 'seu-email-aqui@gmail.com'; 

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se for você, ignoramos o erro de 'user_not_registered'
  const isSuperUser = user?.email === SUPER_USER_EMAIL;

  if (authError && !isSuperUser) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  const ProtectedRoute = ({ children }) => {
    // Se o perfil for pendente mas for o SuperUser, ele entra.
    if (!user || (user.perfil === "Pendente" && !isSuperUser)) {
      return <Navigate to="/pendente" replace />;
    }
    return children;
  };

  const AdminRoute = ({ children }) => {
    // SuperUser também tem poderes de Admin para configurar o banco
    if (!isSuperUser && (!user || user.perfil !== "Administrador")) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Landing Page sempre acessível */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        
        <Route path="/admin" element={
          <AdminRoute>
            <AdminUsuarios />
          </AdminRoute>
        } />
      </Route>

      {/* Se não estiver logado, manda pra landing. Se estiver, manda pro dash */}
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