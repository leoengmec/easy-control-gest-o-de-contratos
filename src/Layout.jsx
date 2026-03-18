import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, FileText, DollarSign, PiggyBank, BarChart2,
  Menu, X, LogOut, Scale, ShoppingCart, Shield, Bell,
  CheckSquare, ChevronLeft, ChevronRight, FilePlus, ChevronDown
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
  
  // Estado para controlar quais grupos estão expandidos
  const [openGroups, setOpenGroups] = useState({
    "Gestão Inteligente": true,
    "Fiscalização Contratual": true,
    "Planejamento": false,
    "Configurações": false,
    "Administrador": false
  });

  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const userRole = user?.role || "direcao";

  return (
    <div className="min-h-screen flex transition-colors duration-300" 
         style={{ backgroundColor: 'var(--bg-primary, #f9fafb)', color: 'var(--text-primary, #1a2e4a)' }}>
      
      <BarraAcessibilidade />

      <style>{`
        body { background-color: var(--bg-primary, #f9fafb) !important; color: var(--text-primary, #1a2e4a) !important; }
        .nav-active { background: rgba(255,255,255,0.15) !important; border-left: 4px solid currentColor !important; font-weight: 600; }
        
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

      {/* Sidebar */}
      <aside 
        style={{ backgroundColor: 'var(--bg-sidebar, #1a2e4a)' }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-all duration-300 shadow-xl ${sidebarOpen ? "w-64" : "w-20"}`}
      >
        {/* Cabeçalho Sidebar */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "hidden"}`}>
            <Scale className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-base tracking-tight uppercase">Easy Control</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-white/10 rounded-lg mx-auto transition-colors">
            {sidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
          </button>
        </div>

        {/* Navegação com Accordion */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {menuGroups.map((group, idx) => {
            if (group.adminOnly && userRole !== "admin") return null;
            const filteredItems = group.items.filter(i => i.roles.includes(userRole));
            if (filteredItems.length === 0) return null;

            const isExpanded = openGroups[group.title];

            return (
              <div key={idx} className="space-y-1">
                {sidebarOpen ? (
                  /* Título do Grupo Clicável */
                  <button 
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-black text-white/50 hover:text-white uppercase tracking-[0.1em] transition-all"
                  >
                    <span>{group.title}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                  </button>
                ) : (
                  <div className="h-px bg-white/10 my-4 mx-2" />
                )}

                {/* Lista de Itens (visível se expandido ou se sidebar estiver recolhida) */}
                <div className={`space-y-1 overflow-hidden transition-all ${isExpanded || !sidebarOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                  {filteredItems.map(item => {
                    const isActive = location.pathname.includes(item.page) || (currentPageName === item.page);
                    return (
                      <Link
                        key={item.page}
                        to={item.future ? "#" : createPageUrl(item.page)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "nav-active" : "opacity-70 hover:opacity-100 hover:bg-white/5"} ${item.future ? "cursor-not-allowed opacity-20" : ""}`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar - Perfil */}
        {user && sidebarOpen && (
          <div className="p-4 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shadow-inner">
                {user.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate leading-none mb-1">{user.full_name}</p>
                <p className="text-[10px] opacity-50 uppercase font-medium">{user.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full text-white/40 hover:text-white hover:bg-red-500/10 h-8 text-[11px] justify-start p-2 rounded-md" onClick={() => base44.auth.logout()}>
              <LogOut size={14} className="mr-2" /> Sair do Sistema
            </Button>
          </div>
        )}
      </aside>

      {/* Área de Conteúdo */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <main className="flex-1 p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}