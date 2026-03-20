import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menus = [
    {
      grupo: "Gestão e Fiscalização",
      itens: [
        { nome: "Dashboard", path: "/" },
        { nome: "Contratos", path: "/contratos" },
        { nome: "Notas de Empenho", path: "/empenhos" },
        { nome: "Extrato de Pagamentos", path: "/extrato-pagamentos" }
      ]
    },
    {
      grupo: "Configurações",
      itens: [
        { nome: "Meus Alertas", path: "/alertas" }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-base">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a2e4a] text-white transition-transform transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 shadow-2xl`}>
         <div className="p-6 border-b border-white/10 font-black text-xl uppercase italic">
           Easy <span className="text-blue-400">Control</span>
         </div>
         <div className="p-4 space-y-6">
            {menus.map((grupo, idx) => (
              <div key={idx}>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">
                  {grupo.grupo}
                </div>
                <div className="space-y-1">
                  {grupo.itens.map((item, i) => (
                    <Link
                      key={i}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase transition-all ${location.pathname === item.path ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/10"}`}
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
        <header className="flex items-center justify-between bg-white border-b p-4 px-8 shadow-sm">
          <button className="md:hidden font-black text-[#1a2e4a]" onClick={() => setSidebarOpen(true)}>MENU</button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-sm font-black text-[#1a2e4a] uppercase">Leonardo Pereira da Silva</div>
            <div className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-1 rounded">SUPERVISOR</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}