import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, FileText, DollarSign, Package, AlertTriangle, Trash2, RefreshCw } from "lucide-react";

const ENTIDADES = [
  {
    id: "LancamentoFinanceiro",
    label: "Lançamentos Financeiros",
    icon: DollarSign,
    desc: "Todos os lançamentos de pagamentos, provisões e notas fiscais",
    color: "text-blue-700 bg-blue-100",
    warningMsg: "Esta ação irá excluir TODOS os lançamentos financeiros permanentemente."
  },
  {
    id: "ItemMaterialNF",
    label: "Itens de Notas Fiscais de Material",
    icon: Package,
    desc: "Itens extraídos das notas fiscais de fornecimento de materiais",
    color: "text-green-700 bg-green-100",
    warningMsg: "Esta ação irá excluir TODOS os itens de material permanentemente."
  },
  {
    id: "NotaEmpenho",
    label: "Notas de Empenho",
    icon: FileText,
    desc: "Empenhos vinculados aos contratos",
    color: "text-purple-700 bg-purple-100",
    warningMsg: "Esta ação irá excluir TODAS as notas de empenho permanentemente."
  },
];

function EntidadeCard({ entidade }) {
  const [count, setCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [msg, setMsg] = useState("");

  const buscarContagem = async () => {
    setLoadingCount(true);
    const data = await base44.entities[entidade.id].list(null, 1000);
    setCount(data.length);
    setLoadingCount(false);
  };

  const handleExcluirTodos = async () => {
    if (confirmInput !== "CONFIRMAR") return;
    setExcluindo(true);
    const data = await base44.entities[entidade.id].list(null, 1000);
    for (const item of data) {
      await base44.entities[entidade.id].delete(item.id);
    }
    setExcluindo(false);
    setConfirmando(false);
    setConfirmInput("");
    setCount(0);
    setMsg(`${data.length} registro(s) excluído(s) com sucesso.`);
    setTimeout(() => setMsg(""), 5000);
  };

  const Icon = entidade.icon;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${entidade.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2e4a]">{entidade.label}</p>
              <p className="text-xs text-gray-400">{entidade.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {count !== null && (
              <Badge variant="outline" className="text-xs">{count} registro(s)</Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={buscarContagem}
              disabled={loadingCount}
            >
              {loadingCount ? "..." : "Contar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirmando(!confirmando)}
            >
              Limpar Dados
            </Button>
          </div>
        </div>

        {msg && (
          <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">
            {msg}
          </div>
        )}

        {confirmando && (
          <div className="border border-red-200 bg-red-50/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Atenção! Ação irreversível</p>
                <p className="text-xs text-red-600">{entidade.warningMsg}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Digite <strong>CONFIRMAR</strong> para prosseguir:</p>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="CONFIRMAR"
                className="border rounded px-3 py-1.5 text-sm w-full outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setConfirmando(false); setConfirmInput(""); }}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={handleExcluirTodos}
                disabled={confirmInput !== "CONFIRMAR" || excluindo}
              >
                {excluindo ? "Excluindo..." : "Excluir Tudo"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDados() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-[#1a2e4a]" />
        <h2 className="text-base font-semibold text-[#1a2e4a]">Gerenciamento de Dados</h2>
      </div>
      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>As operações de limpeza de dados são <strong>irreversíveis</strong>. Tenha certeza antes de prosseguir.</span>
      </div>
      <div className="space-y-3">
        {ENTIDADES.map(e => <EntidadeCard key={e.id} entidade={e} />)}
      </div>
    </div>
  );
}