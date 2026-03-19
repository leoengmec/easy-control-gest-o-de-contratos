import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menus = [
    {
      grupo: "Gestão Inteligente",
      itens: [
        { nome: "Dashboard", path: "/" },
        { nome: "Relatórios", path: "/relatorios" }
      ]
    },
    {
      grupo: "Fiscalização Contratual",
      itens: [
        { nome: "Contratos", path: "/contratos" },
        { nome: "Controle de Materiais", path: "/controle-materiais" },
        { nome: "Pedidos e Autorizações", path: "/pedidos" },
        { nome: "Revisão", path: "/revisao" }
      ]
    },
    {
      grupo: "Controle Financeiro",
      itens: [
        { nome: "Extrato de Pagamentos", path: "/extrato" },
        { nome: "Novo Lançamento", path: "/lancamentos" },
        { nome: "Notas de Empenho", path: "/empenhos" },
        { nome: "Aditivos e Vigências", path: "/aditivos" },
        { nome: "Repactuações", path: "/repactuacoes" }
      ]
    },
    {
      grupo: "Configurações",
      itens: [
        { nome: "Meus Alertas", path: "/alertas" },
        { nome: "Administrador", path: "/admin" }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a2e4a] text-white transition-transform transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
         <div className="flex items-center justify-between p-6 border-b border-white/10">
           <div className="font-black text-xl tracking-widest uppercase">Easy Control</div>
           <button className="md:hidden font-bold" onClick={() => setSidebarOpen(false)}>
             FECHAR
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
                        {item.nome}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
         </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
          <button className="md:hidden text-gray-600 font-bold" onClick={() => setSidebarOpen(true)}>
            MENU
          </button>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-[#1a2e4a] uppercase">Leonardo</div>
            <button className="p-2 bg-red-50 text-red-600 rounded font-bold text-xs uppercase hover:bg-red-100 transition-colors">
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}