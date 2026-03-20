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
        { nome: "Revisão", path: "/revisao" }
      ]
    },
    {
      grupo: "Controle Financeiro",
      itens: [
        { nome: "Extrato de Pagamentos", path: "/extrato" },
        { nome: "Notas de Empenho", path: "/empenhos" }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a2e4a] text-white transition-transform transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
         <div className="p-6 border-b border-white/10 font-black uppercase tracking-widest text-xl">Easy Control</div>
         <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
            {menus.map((grupo, idx) => (
              <div key={idx}>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-3">{grupo.grupo}</div>
                <div className="space-y-1">
                  {grupo.itens.map((item, i) => (
                    <Link
                      key={i}
                      to={item.path}
                      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold uppercase transition-colors ${location.pathname === item.path ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/10"}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.nome}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
         </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-4 px-8 flex justify-between items-center">
          <button className="md:hidden font-bold" onClick={() => setSidebarOpen(true)}>MENU</button>
          <div className="flex items-center gap-4 ml-auto font-bold text-[#1a2e4a] uppercase text-sm">
            Leonardo P. Silva
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}