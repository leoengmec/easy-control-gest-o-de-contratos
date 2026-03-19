import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Importação das Páginas para Rotas Explícitas
import MinhasConfiguracoesAlertas from './pages/MinhasConfiguracoesAlertas';
import Revisao from './pages/Revisao';
import ExtratoPagamentos from './pages/ExtratoPagamentos';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Exibe spinner de carregamento durante a verificação de autenticação
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Tratamento de erros de autenticação
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
      {/* Rota Principal */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />

      {/* Mapeamento Automático de Páginas do pagesConfig */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      {/* Rotas Explícitas de Funcionalidades Específicas */}
      <Route
        path="/MinhasConfiguracoesAlertas"
        element={
          <LayoutWrapper currentPageName="MinhasConfiguracoesAlertas">
            <MinhasConfiguracoesAlertas />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Revisao"
        element={
          <LayoutWrapper currentPageName="Revisao">
            <Revisao />
          </LayoutWrapper>
        }
      />
      <Route
        path="/ExtratoPagamentos"
        element={
          <LayoutWrapper currentPageName="ExtratoPagamentos">
            <ExtratoPagamentos />
          </LayoutWrapper>
        }
      />

      {/* Rota para páginas não encontradas */}
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
  )
}

export default App