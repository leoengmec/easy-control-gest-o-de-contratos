import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// 1. Importação do Layout com Sidebar Azul Marinho JFRN
import Layout from './Layout';

// 2. Importação das Páginas do EASY CONTROL (Certifique-se que os nomes dos arquivos na pasta /pages coincidam)
import Dashboard from './pages/Dashboard';
import Contratos from './pages/Contratos';
import ContratoDetalhe from './pages/ContratoDetalhe';
import Empenhos from './pages/Empenhos';
import ExtratoPagamentos from './pages/ExtratoPagamentos';
import MinhasConfiguracoesAlertas from './pages/MinhasConfiguracoesAlertas';

const { Pages } = pagesConfig;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Tela de carregamento personalizada com a cor institucional
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

  // Tratamento de erros de autenticação do Base44
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
      {/* O componente Layout envolve todas as rotas internas */}
      <Route element={<Layout />}>
        
        {/* Redirecionamento da raiz para o Dashboard (Visão Geral) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Definição das Rotas Principais */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contrato-detalhe" element={<ContratoDetalhe />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/extrato-pagamentos" element={<ExtratoPagamentos />} />
        <Route path="/alertas" element={<MinhasConfiguracoesAlertas />} />

        {/* Mapeamento Automático para manter compatibilidade com o pages.config original */}
        {Object.entries(Pages).map(([path, PageComponent]) => (
          <Route key={path} path={`/${path}`} element={<PageComponent />} />
        ))}
        
      </Route>

      {/* Rota de erro para caminhos inexistentes */}
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