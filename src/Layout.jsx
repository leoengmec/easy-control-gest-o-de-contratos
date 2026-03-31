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
  ChevronLeft,
  LogOut,
  Scale,
  ShoppingCart,
  Shield,
  Bell
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
  { label: "Meus Alertas", page: "MinhasConfiguracoesAlertas", icon: Bell, roles: ["admin", "gestor", "fiscal", "direcao"] },
  { label: "Administração", page: "AdminPanel", icon: Shield, roles: ["admin"] },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Se o usuário não tem role ou tem role "user" e foi criado recentemente (últimas 2h), gera notificação
      if (u && (!u.role || u.role === "user")) {
        const criadoEm = u.created_date ? new Date(u.created_date) : null;
        const agora = new Date();
        const duasHoras = 2 * 60 * 60 * 1000;
        if (criadoEm && (agora - criadoEm) < duasHoras) {
          // Verifica se já existe notificação para este usuário para não duplicar
          base44.entities.NotificacaoAdmin.filter({ dados_extras: u.email })
            .then(existentes => {
              if (existentes.length === 0) {
                base44.entities.NotificacaoAdmin.create({
                  tipo: "novo_usuario",
                  titulo: "Novo usuário registrado",
                  mensagem: `${u.full_name || u.email} criou uma conta e aguarda atribuição de perfil.`,
                  lida: false,
                  dados_extras: u.email,
                });
              }
            }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  const userRole = user?.role || "direcao";
  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  if (currentPageName === "LandingPage") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <BarraAcessibilidade />
      <style>{`
        :root {
          --primary: 220 70% 30%;
          --primary-foreground: 0 0% 100%;
        }
        .nav-active { background: #1e3a5f; color: white; }
        .nav-item:hover { background: #2a4a7a; color: white; }
      `}</style>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${isCollapsed ? "w-20" : "w-64"} bg-[#1a2e4a] text-white flex flex-col transform transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10 relative">
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <div className="font-bold text-sm leading-tight">Easy Control</div>
                <div className="text-xs text-blue-300">Gestão de Contratos</div>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-6 z-50 bg-white border border-gray-200 text-gray-800 rounded-full p-1 shadow-sm hover:bg-gray-50"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = location.pathname.includes(item.page) || (currentPageName === item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isActive ? "nav-active" : "text-blue-100"} ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user && (
          <div className="p-4 border-t border-white/10">
            {!isCollapsed ? (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                  {user.full_name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{user.full_name}</div>
                  <div className="text-xs text-blue-300 capitalize">{user.role || "usuário"}</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold shrink-0" title={user.full_name}>
                  {user.full_name?.charAt(0) || "U"}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`w-full text-blue-200 hover:text-white hover:bg-white/10 text-xs ${isCollapsed ? "justify-center px-0" : "justify-start"}`}
              onClick={() => base44.auth.logout()}
              title={isCollapsed ? "Sair" : undefined}
            >
              <LogOut className={`w-4 h-4 ${!isCollapsed ? "mr-2" : ""}`} /> {!isCollapsed && "Sair"}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className={`hidden lg:flex bg-[#111e30] text-blue-300/60 text-[10px] py-3 flex-col gap-0.5 border-t border-white/5 text-center ${isCollapsed ? "px-1" : "px-4"}`}>
          {!isCollapsed ? (
            <>
              <span>© {new Date().getFullYear()} Easy Control — Gestão de Contratos</span>
              <span>Desenvolvido por <span className="text-blue-200/80 font-medium">Leonardo Alves</span> · v1.0.0</span>
            </>
          ) : (
            <span className="leading-tight">© {new Date().getFullYear()}<br/>v1.0.0</span>
          )}
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="font-semibold text-[#1a2e4a]">Easy Control</div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}