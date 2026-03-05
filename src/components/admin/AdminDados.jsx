import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, FileText, DollarSign, Package, AlertTriangle, Trash2, RefreshCw, Download } from "lucide-react";

const ENTIDADES_SIMPLES = [
  {
    id: "LancamentoFinanceiro",
    label: "Lançamentos Financeiros",
    icon: DollarSign,
    desc: "Todos os lançamentos de pagamentos, provisões e notas fiscais",
    color: "text-blue-700 bg-blue-100",
    warningMsg: "Esta ação irá excluir TODOS os lançamentos financeiros permanentemente."
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
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={buscarContagem} disabled={loadingCount}>
              {loadingCount ? "..." : "Contar"}
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmando(!confirmando)}>
              Limpar Dados
            </Button>
          </div>
        </div>
        {msg && <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">{msg}</div>}
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
              <input type="text" value={confirmInput} onChange={e => setConfirmInput(e.target.value)} placeholder="CONFIRMAR"
                className="border rounded px-3 py-1.5 text-sm w-full outline-none focus:ring-1 focus:ring-red-400" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setConfirmando(false); setConfirmInput(""); }}>Cancelar</Button>
              <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleExcluirTodos} disabled={confirmInput !== "CONFIRMAR" || excluindo}>
                {excluindo ? "Excluindo..." : "Excluir Tudo"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemMaterialNFCard() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [excluindo, setExcluindo] = useState(false);
  const [msg, setMsg] = useState("");

  // Agrupa itens por número de NF
  const nfAgrupadas = itens.reduce((acc, item) => {
    const chave = item.numero_nf || "(sem NF)";
    if (!acc[chave]) acc[chave] = { numero_nf: chave, os_numero: item.os_numero, itens: [] };
    acc[chave].itens.push(item);
    return acc;
  }, {});
  const nfList = Object.values(nfAgrupadas).sort((a, b) => a.numero_nf.localeCompare(b.numero_nf));

  const carregar = async () => {
    setLoading(true);
    const data = await base44.entities.ItemMaterialNF.list(null, 2000);
    setItens(data);
    setCarregado(true);
    setSelecionados(new Set());
    setLoading(false);
  };

  const toggleNF = (nf) => {
    const ids = nfAgrupadas[nf].itens.map(i => i.id);
    setSelecionados(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const todosNFSelecionados = (nf) =>
    nfAgrupadas[nf].itens.every(i => selecionados.has(i.id));

  const handleExcluir = async () => {
    if (selecionados.size === 0) return;
    setExcluindo(true);
    for (const id of selecionados) {
      await base44.entities.ItemMaterialNF.delete(id);
    }
    const count = selecionados.size;
    setItens(prev => prev.filter(i => !selecionados.has(i.id)));
    setSelecionados(new Set());
    setExcluindo(false);
    setMsg(`${count} item(s) excluído(s) com sucesso.`);
    setTimeout(() => setMsg(""), 5000);
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-green-700 bg-green-100">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2e4a]">Itens de Notas Fiscais de Material</p>
              <p className="text-xs text-gray-400">Selecione notas fiscais para excluir os itens associados</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1 flex-shrink-0" onClick={carregar} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {carregado ? "Recarregar" : "Carregar"}
          </Button>
        </div>

        {msg && <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">{msg}</div>}

        {carregado && (
          <>
            {nfList.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum item encontrado.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {nfList.map(nf => (
                  <label key={nf.numero_nf} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={todosNFSelecionados(nf.numero_nf)}
                      onChange={() => toggleNF(nf.numero_nf)}
                      className="w-4 h-4 accent-red-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#1a2e4a]">NF {nf.numero_nf}</span>
                        {nf.os_numero && (
                          <Badge variant="outline" className="text-xs">OS {nf.os_numero}</Badge>
                        )}
                        <span className="text-xs text-gray-400">{nf.itens.length} item(s)</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selecionados.size > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500">{selecionados.size} item(s) selecionado(s)</span>
                <Button
                  size="sm"
                  className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1"
                  onClick={handleExcluir}
                  disabled={excluindo}
                >
                  <Trash2 className="w-3 h-3" />
                  {excluindo ? "Excluindo..." : "Excluir Selecionados"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDados() {
  const [exportando, setExportando] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importErro, setImportErro] = useState("");

  const handleExportarBD = async () => {
    setExportando(true);
    setExportMsg("");
    const response = await base44.functions.invoke('exportDatabase');
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `easer_control_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    setExportando(false);
    setExportMsg("Backup exportado com sucesso!");
    setTimeout(() => setExportMsg(""), 5000);
  };

  const handleImportarBD = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportErro("");
    setImportMsg("");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImportando(true);
      const db = JSON.parse(evt.target.result);
      const response = await base44.functions.invoke('importDatabase', { db });
      setImportando(false);
      if (response.data?.success) {
        const total = Object.values(response.data.resultado).reduce((acc, r) => acc + r.importados, 0);
        setImportMsg(`Importação concluída! ${total} registro(s) importado(s).`);
      } else {
        setImportErro(response.data?.error || "Erro ao importar o backup.");
      }
      setTimeout(() => { setImportMsg(""); setImportErro(""); }, 8000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1a2e4a]" />
          <h2 className="text-base font-semibold text-[#1a2e4a]">Gerenciamento de Dados</h2>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-[#1a2e4a] hover:bg-[#243d5e] text-white text-xs"
          onClick={handleExportarBD}
          disabled={exportando}
        >
          <Download className="w-3.5 h-3.5" />
          {exportando ? "Exportando..." : "Exportar Banco de Dados (JSON)"}
        </Button>
      </div>

      {exportMsg && (
        <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">
          {exportMsg}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>As operações de limpeza de dados são <strong>irreversíveis</strong>. Tenha certeza antes de prosseguir.</span>
      </div>
      <div className="space-y-3">
        {ENTIDADES_SIMPLES.map(e => <EntidadeCard key={e.id} entidade={e} />)}
        <ItemMaterialNFCard />
      </div>
    </div>
  );
}