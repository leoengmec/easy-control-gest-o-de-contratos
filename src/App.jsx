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
import Lancamentos from "@/pages/Lancamentos"; 
import Relatorios from "@/pages/Relatorios";
import Revisao from "@/pages/Revisao";
import ControleMateriais from "@/pages/ControleMateriais";

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin, user } = useAuth();
  
  // ✅ ATUALIZADO: E-mail que aparece no seu print de login
  const SUPER_USER_EMAIL = 'bielribeirogamer@gmail.com'; 

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSuperUser = user?.email === SUPER_USER_EMAIL;

  if (authError && !isSuperUser) {
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pendente" element={<UserNotRegisteredError />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/revisao" element={<Revisao />} />
        <Route path="/controle-materiais" element={<ControleMateriais />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/admin" element={<AdminUsuarios />} />
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