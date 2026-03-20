import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  ClipboardList, 
  Receipt, 
  PlusCircle, 
  Wallet, 
  CalendarClock, 
  RefreshCcw, 
  Bell, 
  ShieldCheck,
  LogOut,
  Menu,
  X
} from "lucide-react"; // Adicionei ícones para uma interface mais moderna

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menus = [
    {
      grupo: "Gestão Inteligente",
      itens: [
        { nome: "Dashboard", path: "/dashboard", icone: <LayoutDashboard size={18} /> },
        { nome: "Relatórios", path: "/relatorios", icone: <FileText size={18} /> }
      ]
    },
    {
      grupo: "Fiscalização Contratual",
      itens: [
        { nome: "Contratos", path: "/contratos", icone: <ClipboardList size={18} /> },
        { nome: "Controle de Materiais", path: "/controle-materiais", icone: <Package size={18} /> },
        { nome: "Revisão", path: "/revisao", icone: <RefreshCcw size={18} /> }
      ]
    },
    {
      grupo: "Controle Financeiro",
      itens: [
        { nome: "Extrato de Pagamentos", path: "/extrato-pagamentos", icone: <Receipt size={18} /> },
        { nome: "Notas de Empenho", path: "/empenhos", icone: <Wallet size={18} /> },
        { nome: "Aditivos e Vigências", path: "/aditivos", icone: <CalendarClock size={18} /> }
      ]
    },
    {
      grupo: "Configurações",
      itens: [
        { nome: "Meus Alertas", path: "/alertas", icone: <Bell size={18} /> },
        { nome: "Administrador", path: "/admin", icone: <ShieldCheck size={18} /> }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* Sidebar JFRN */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a2e4a] text-white transition-transform duration-300 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 shadow-2xl`}>
         <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#16273e]">
           <div className="font-black text-xl tracking-tighter uppercase italic">
             Easy <span className="text-blue-400">Control</span>
           </div>
           <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
             <X size={24} />
           </button>
         </div>

         <div className="overflow-y-auto h-[calc(100vh-85px)] p-4 space-y-6">
            {menus.map((grupo, idx) => (
              <div key={idx}>
                <div className="text-[10px] font-black text-blue-300/50 uppercase tracking-[0.2em] mb-3 px-3">
                  {grupo.grupo}
                </div>
                <div className="space-y-1">
                  {grupo.itens.map((item, itemIdx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all duration-200 ${
                          isActive 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                            : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.icone}
                        {item.nome}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
         </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-8 py-4 shadow-sm z-40">
          <button className="md:hidden text-[#1a2e4a]" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <div className="hidden md:block">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sistema de Gestão de Manutenção</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="text-sm font-black text-[#1a2e4a] uppercase leading-none">Leonardo P. Silva</div>
              <div className="text-[10px] font-bold text-blue-600 uppercase mt-1">Supervisor de Manutenção</div>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-black text-[10px] uppercase hover:bg-red-100 transition-all border border-red-100">
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        
      </div>
    </div>
  );
}