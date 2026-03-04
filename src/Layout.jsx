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
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gestor", "fiscal", "direcao"] },
  { label: "Contratos", page: "Contratos", icon: FileText, roles: ["admin", "gestor", "fiscal", "direcao"] },
  { label: "Lançamentos", page: "Lancamentos", icon: DollarSign, roles: ["admin", "gestor", "fiscal"] },
  { label: "Orçamento", page: "Orcamento", icon: PiggyBank, roles: ["admin", "gestor", "direcao"] },
  { label: "Relatórios", page: "Relatorios", icon: BarChart2, roles: ["admin", "gestor", "direcao"] },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const userRole = user?.role || "direcao";
  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <style>{`
        :root {
          --primary: 220 70% 30%;
          --primary-foreground: 0 0% 100%;
        }
        .nav-active { background: #1e3a5f; color: white; }
        .nav-item:hover { background: #2a4a7a; color: white; }
      `}</style>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a2e4a] text-white flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">JFRN</div>
              <div className="text-xs text-blue-300">Gestão de Contratos</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(item => {
            const isActive = location.pathname.includes(item.page) || (currentPageName === item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isActive ? "nav-active" : "text-blue-100"}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{user.full_name}</div>
                <div className="text-xs text-blue-300 capitalize">{user.role || "usuário"}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-blue-200 hover:text-white hover:bg-white/10 text-xs justify-start"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-3 h-3 mr-2" /> Sair
            </Button>
          </div>
        )}
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="font-semibold text-[#1a2e4a]">JFRN - Gestão de Contratos</div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}