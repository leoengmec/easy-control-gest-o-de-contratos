import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Users, Database, Settings, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AdminUsuarios from "@/components/admin/AdminUsuarios.jsx";
import AdminDados from "@/components/admin/AdminDados.jsx";
import AdminConfiguracoes from "@/components/admin/AdminConfiguracoes.jsx";

const TABS = [
  { id: "usuarios",     label: "Usuários",         icon: Users,    desc: "Gerenciar usuários e permissões" },
  { id: "dados",        label: "Dados",             icon: Database, desc: "Gerenciar registros do sistema" },
  { id: "configuracoes",label: "Configurações",     icon: Settings, desc: "Configurações gerais do sistema" },
];

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios");

  useEffect(() => {
    base44.auth.me().then(setUser).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="w-12 h-12 text-red-300" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Acesso Restrito</p>
          <p className="text-sm text-gray-400">Apenas administradores podem acessar este painel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Painel de Administração</h1>
          <p className="text-sm text-gray-500">Ferramentas restritas para administradores do sistema</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border
              ${activeTab === tab.id
                ? "bg-[#1a2e4a] text-white border-[#1a2e4a]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "usuarios"      && <AdminUsuarios />}
      {activeTab === "dados"         && <AdminDados />}
      {activeTab === "configuracoes" && <AdminConfiguracoes />}
    </div>
  );
}