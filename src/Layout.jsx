import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, FileText, DollarSign, PiggyBank, BarChart2,
  Menu, X, LogOut, Scale, ShoppingCart, Shield, Bell,
  CheckSquare, ChevronLeft, ChevronRight, FilePlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BarraAcessibilidade from "@/components/acessibilidade/BarraAcessibilidade";

const menuGroups = [
  {
    title: "Gestão Inteligente",
    items: [
      { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gestor", "fiscal", "direcao"] },
      { label: "Relatórios (PDF)", page: "Relatorios", icon: BarChart2, roles: ["admin", "gestor", "direcao"] },
    ]
  },
  {
    title: "Fiscalização Contratual",
    items: [
      { label: "Contratos", page: "Contratos", icon: FileText, roles: ["admin", "gestor", "fiscal", "direcao"] },
      { label: "Pagamentos", page: "Lancamentos", icon: DollarSign, roles: ["admin", "gestor", "fiscal"] },
      { label: "Pedidos e Autorizações", page: "Pedidos", icon: FilePlus, roles: ["admin", "gestor", "fiscal"], future: true },
      { label: "Controle de Materiais", page: "ControleMateriais", icon: ShoppingCart, roles: ["admin", "gestor", "fiscal"] },
      { label: "Revisão", page: "Revisao", icon: CheckSquare, roles: ["admin", "gestor"] },
    ]
  },
  {
    title: "Planejamento",
    items: [
      { label: "Orçamento", page: "Orcamento", icon: PiggyBank, roles: ["admin", "gestor", "direcao"] },
    ]
  },
  {
    title: "Configurações",
    items: [
      { label: "Meus Alertas", page: "MinhasConfiguracoesAlertas", icon: Bell, roles: ["admin", "gestor", "fiscal", "direcao"] },
    ]
  },
  {
    title: "Administrador",
    adminOnly: true,
    items: [
      { label: "Painel Admin", page: "AdminPanel", icon: Shield, roles: ["admin"] },
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  if (currentPageName === "LandingPage") return <>{children}</>;

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const userRole = user?.role || "direcao";

  return (
    <div className="min-h-screen flex transition-colors duration-300" 
         style={{ backgroundColor: 'var(--bg-primary, #f9fafb)', color: 'var(--text-primary, #1a2e4a)' }}>
      
      <BarraAcessibilidade />

      <style>{`
        body { background-color: var(--bg-primary, #f9fafb) !important; color: var(--text-primary, #1a2e4a) !important; }
        .nav-active { background: rgba(255,255,255,0.15) !important; border-left: 4px solid currentColor !important; }
        
        /* Proteção do Modo Contraste */
        :root[style*="--bg-primary"]:not([style*="#ffffff"]) main *:not(.fixed *),
        :root[style*="--bg-primary"]:not([style*="#ffffff"]) div[class*="bg-white"]:not(.fixed *) {
          background-color: transparent !important;
          color: inherit !important;
          border-color: currentColor !important;
          box-shadow: none !important;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

      <aside 
        style={{ backgroundColor: 'var(--bg-sidebar, #1a2e4a)' }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-all duration-300 shadow-xl ${sidebarOpen ? "w-64" : "w-20"}`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "hidden"}`}>
            <Scale className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-sm tracking-tight uppercase">Easy Control</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-white/10 rounded-lg mx-auto">
            {sidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {menuGroups.map((group, idx) => {
            if (group.adminOnly && userRole !== "admin") return null;
            const filteredItems = group.items.filter(i => i.roles.includes(userRole));
            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {sidebarOpen && (
                  <p className="text-[10px] font-bold text-white/40 px-3 mb-2 uppercase tracking-widest">
                    {group.title}
                  </p>
                )}
                {filteredItems.map(item => {
                  const isActive = location.pathname.includes(item.page) || (currentPageName === item.page);
                  return (
                    <Link
                      key={item.page}
                      to={item.future ? "#" : createPageUrl(item.page)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? "nav-active" : "opacity-70 hover:opacity-100 hover:bg-white/5"} ${item.future ? "cursor-not-allowed opacity-20" : ""}`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {user && sidebarOpen && (
          <div className="p-4 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                {user.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">{user.full_name}</p>
                <p className="text-[9px] opacity-50 uppercase">{user.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full text-white/50 hover:text-white h-7 text-[10px] justify-start p-0" onClick={() => base44.auth.logout()}>
              <LogOut size={12} className="mr-2" /> Sair do Sistema
            </Button>
          </div>
        )}
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}