import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Importação do Layout e das Páginas Revisadas
import Layout from './Layout';
import ExtratoPagamentos from './pages/ExtratoPagamentos';
import Empenhos from './pages/Empenhos';
import Contratos from './pages/Contratos';
import ContratoDetalhe from './pages/ContratoDetalhe';

const { Pages, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Rota Principal Dinâmica do Base44 */}
        <Route path="/" element={<MainPage />} />

        {/* Nossas Rotas Revisadas (Prioridade) */}
        <Route path="/extrato-pagamentos" element={<ExtratoPagamentos />} />
        <Route path="/empenhos" element={<Empenhos />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contrato-detalhe" element={<ContratoDetalhe />} />

        {/* Mapeamento Automático de todas as outras páginas do pages.config */}
        {Object.entries(Pages).map(([path, PageComponent]) => (
          <Route key={path} path={`/${path}`} element={<PageComponent />} />
        ))}

        {/* Fallbacks para evitar 404 em URLs antigas */}
        <Route path="/extrato" element={<Navigate to="/extrato-pagamentos" replace />} />
        <Route path="/ExtratoPagamentos" element={<Navigate to="/extrato-pagamentos" replace />} />
      </Route>

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