import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  PackageCheck,
  FileSignature,
  CheckSquare,
  Landmark,
  Receipt,
  PlusCircle,
  FilePlus,
  Calculator,
  Bell,
  Settings,
  Menu,
  X,
  LogOut
} from "lucide-react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menus = [
    {
      grupo: "Gestão Inteligente",
      itens: [
        { nome: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
        { nome: "Relatórios", path: "/relatorios", icon: <FileText size={18} /> }
      ]
    },
    {
      grupo: "Fiscalização Contratual",
      itens: [
        { nome: "Contratos", path: "/contratos", icon: <Briefcase size={18} /> },
        { nome: "Controle de Materiais", path: "/controle-materiais", icon: <PackageCheck size={18} /> },
        { nome: "Pedidos e Autorizações", path: "/pedidos", icon: <FileSignature size={18} /> },
        { nome: "Revisão", path: "/revisao", icon: <CheckSquare size={18} /> }
      ]
    },
    {
      grupo: "Controle Financeiro",
      itens: [
        { nome: "Extrato de Pagamentos", path: "/extrato", icon: <Receipt size={18} /> },
        { nome: "Novo Lançamento", path: "/lancamentos", icon: <PlusCircle size={18} /> },
        { nome: "Notas de Empenho", path: "/empenhos", icon: <Landmark size={18} /> },
        { nome: "Aditivos e Vigências", path: "/aditivos", icon: <FilePlus size={18} /> },
        { nome: "Repactuações", path: "/repactuacoes", icon: <Calculator size={18} /> }
      ]
    },
    {
      grupo: "Configurações",
      itens: [
        { nome: "Meus Alertas", path: "/alertas", icon: <Bell size={18} /> },
        { nome: "Administrador", path: "/admin", icon: <Settings size={18} /> }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* Menu Lateral Escuro */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a2e4a] text-white transition-transform transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
         <div className="flex items-center justify-between p-6 border-b border-white/10">
           <div className="font-black text-xl tracking-widest uppercase">Easy Control</div>
           <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
             <X size={24} className="text-white" />
           </button>
         </div>

         <div className="overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-6">
            {menus.map((grupo, idx) => (
              <div key={idx}>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">
                  {grupo.grupo}
                </div>
                <div className="space-y-1">
                  {grupo.itens.map((item, itemIdx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                      >
                        {item.icon}
                        {item.nome}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
         </div>
      </aside>

      {/* Área Central (Onde as páginas carregam) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Cabeçalho Superior */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
          <button className="md:hidden text-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-[#1a2e4a] uppercase">Leonardo</div>
            <button className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* O <Outlet /> é o buraco onde as telas (Extrato, Lancamentos) são injetadas pelo React */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}