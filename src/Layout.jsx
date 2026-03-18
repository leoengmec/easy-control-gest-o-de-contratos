import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  PiggyBank,
  BarChart2,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Scale,
  ShoppingCart,
  Shield,
  Bell,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BarraAcessibilidade from "@/components/acessibilidade/BarraAcessibilidade";

const navItems = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gestor", "fiscal", "direcao"] },
  { label: "Contratos", page: "Contratos", icon: FileText, roles: ["admin", "gestor", "fiscal", "direcao"] },
  { label: "Lançamentos", page: "Lancamentos", icon: DollarSign, roles: ["admin", "gestor", "fiscal"] },
  { label: "Orçamento", page: "Orcamento", icon: PiggyBank, roles: ["admin", "gestor", "direcao"] },
  { label: "Relatórios", page: "Relatorios", icon: BarChart2, roles: ["admin", "gestor", "direcao"] },
  { label: "Controle de Materiais", page: "ControleMateriais", icon: ShoppingCart, roles: ["admin", "gestor", "fiscal"] },
  { label: "Revisão", page: "Revisao", icon: CheckSquare, roles: ["admin", "gestor"] },
  { label: "Meus Alertas", page: "MinhasConfiguracoesAlertas", icon: Bell, roles: ["admin", "gestor", "fiscal", "direcao"] },
  { label: "Administração", page: "AdminPanel", icon: Shield, roles: ["admin"] },
];

export default function Layout({ children, currentPageName }) {
  if (currentPageName === "LandingPage") {
    return <>{children}</>;
  }

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  const userRole = user?.role || "direcao";
  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div 
      className="min-h-screen flex transition-colors duration-300" 
      style={{ 
        backgroundColor: 'var(--bg-primary, #f9fafb)', 
        color: 'var(--text-primary, #1a2e4a)' 
      }}
    >
      <BarraAcessibilidade />

      <style>{`
        /* 1. Força as cores base no corpo do site */
        body { 
          background-color: var(--bg-primary, #f9fafb) !important; 
          color: var(--text-primary, #1a2e4a) !important; 
          transition: background-color 0.3s, color 0.3s;
        }

        /* 2. Se um tema de contraste estiver ativo, forçamos os elementos a herdarem as cores */
        :root[style*="--bg-primary"] main, 
        :root[style*="--bg-primary"] aside {
          background-color: var(--bg-primary) !important;
          color: var(--text-primary) !important;
        }

        /* 3. Garante que textos dentro de cards, tabelas e spans fiquem legíveis */
        :root[style*="--bg-primary"] main * {
          background-color: transparent !important;
          color: inherit !important;
          border-color: currentColor !important;
        }

        /* 4. Destaque visual para itens ativos na navegação */
        .nav-active { 
          background: rgba(255,255,255,0.2) !important; 
          border-left: 4px solid currentColor !important; 
        }

        /* 5. Ajuste para botões e inputs no modo contraste */
        :root[style*="--bg-primary"] button:not(.fixed),
        :root[style*="--bg-primary"] input,
        :root[style*="--bg-primary"] select {
          border: 1px solid currentColor !important;
          background: transparent !important;
          color: currentColor !important;
        }
      `}</style>

      {/* Sidebar */}
      <aside 
        style={{ backgroundColor: 'var(--bg-sidebar, #1a2e4a)' }}
        className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">Easy Control</div>
              <div className="text-xs opacity-70">Gestão de Contratos</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(item => {
            const isActive = location.pathname.includes(item.page) || (currentPageName === item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "nav-active" : "opacity-80 hover:opacity-100 hover:bg-white/5"}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold uppercase">
                {user.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{user.full_name}</div>
                <div className="text-[10px] opacity-60 uppercase">{user.role}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-white/70 hover:text-white hover:bg-white/10 text-xs justify-start"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-3 h-3 mr-2" /> Sair
            </Button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 ml-0 lg:ml-64">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="font-semibold text-[#1a2e4a]">Easy Control</div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      <footer 
        style={{ backgroundColor: 'var(--bg-sidebar, #111e30)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        className="hidden lg:flex fixed bottom-0 left-0 w-64 text-[10px] px-4 py-2 flex-col text-white/40"
      >
        <span>© {new Date().getFullYear()} Easy Control</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}