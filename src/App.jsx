import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// 1. Importando o nosso Layout Oficial e não o legado
import Layout from './Layout';

// 2. Importação das Páginas para Rotas
import MinhasConfiguracoesAlertas from './pages/MinhasConfiguracoesAlertas';
import Revisao from './pages/Revisao';
import ExtratoPagamentos from './pages/ExtratoPagamentos';

const { Pages, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a2e4a] rounded-full animate-spin"></div>
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
      {/* 3. O Layout novo envolve todas as rotas e injeta a página na tag Outlet */}
      <Route element={<Layout />}>
        
        {/* Rota Principal */}
        <Route path="/" element={<MainPage />} />

        {/* 4. Rotas alinhadas com os caminhos do nosso Menu Lateral */}
        <Route path="/extrato" element={<ExtratoPagamentos />} />
        <Route path="/revisao" element={<Revisao />} />
        <Route path="/alertas" element={<MinhasConfiguracoesAlertas />} />

        {/* Mapeamento Automático do pagesConfig para não quebrar telas antigas */}
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}

        {/* Rotas de Fallback (Caso a URL antiga seja acessada diretamente) */}
        <Route path="/ExtratoPagamentos" element={<ExtratoPagamentos />} />
        <Route path="/Revisao" element={<Revisao />} />
        <Route path="/MinhasConfiguracoesAlertas" element={<MinhasConfiguracoesAlertas />} />
        
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
  )
}

export default App