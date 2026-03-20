import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// 1. Importação do Layout Oficial (Sidebar Azul Marinho)
import Layout from './Layout';

// 2. Importação das Páginas Principais do EASY CONTROL
import Dashboard from './pages/Dashboard'; // Certifique-se de ter este arquivo
import Contratos from './pages/Contratos';
import ContratoDetalhe from './pages/ContratoDetalhe';
import Empenhos from './pages/Empenhos';
import ExtratoPagamentos from './pages/ExtratoPagamentos';
import MinhasConfiguracoesAlertas from './pages/MinhasConfiguracoesAlertas';

const { Pages } = pagesConfig;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Loading com a cor institucional da JFRN
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase text-[#1a2e4a] tracking-widest">Sincronizando JFRN...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* O Layout novo envolve as rotas e injeta as páginas no <Outlet /> */}
      <Route element={<Layout />}>
        
        {/* Redirecionamento Inicial: Abre sempre no Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Rotas Amigáveis do Menu Lateral */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contrato-detalhe" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/extrato-pagamentos" element={<ExtratoPagamentos />} />
        <Route path="/alertas" element={<MinhasConfiguracoesAlertas />} />

        {/* Mapeamento Automático (Legado Base44) para não quebrar links antigos */}
        {Object.entries(Pages).map(([path, PageComponent]) => (
          <Route key={path} path={`/${path}`} element={<PageComponent />} />
        ))}
        
      </Route>

      {/* Rota para erro 404 */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;