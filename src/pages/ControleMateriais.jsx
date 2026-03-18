import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Package, Search, X, Loader2 } from "lucide-react";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const LOCAIS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

export default function ControleMateriais() {
  // Inicializamos como array vazio para evitar erro de .map()
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNFs, setExpandedNFs] = useState({});

  const [filtroOS, setFiltroOS] = useState("");
  const [filtroNF, setFiltroNF] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  useEffect(() => {
    base44.entities.ItemMaterialNF.list("-created_date", 1000)
      .then((res) => setItens(res || []))
      .catch(() => setItens([]))
      .finally(() => setLoading(false));
  }, []);

  // Filtro seguro usando optional chaining
  const itensFiltrados = itens?.filter(item => {
    const osOk    = !filtroOS    || (item.os_numero || "").toLowerCase().includes(filtroOS.toLowerCase());
    const nfOk    = !filtroNF    || (item.numero_nf || "").toLowerCase().includes(filtroNF.toLowerCase());
    const localOk = filtroLocal === "todos" || item.os_local === filtroLocal;
    const dataOk  = (() => {
      if (!filtroDataInicio && !filtroDataFim) return true;
      const dataNF = item.data_nf;
      if (!dataNF) return false;
      if (filtroDataInicio && dataNF < filtroDataInicio) return false;
      if (filtroDataFim    && dataNF > filtroDataFim)    return false;
      return true;
    })();
    return osOk && nfOk && localOk && dataOk;
  }) || [];

  // Agrupar itens por NF
  const nfsMap = {};
  itensFiltrados.forEach(item => {
    const key = item.numero_nf || "S-NF-" + (item.os_numero || "Geral");
    if (!nfsMap[key]) {
      nfsMap[key] = {
        numero_nf: item.numero_nf || "Não Informada",
        data_nf: item.data_nf,
        os_numero: item.os_numero,
        os_local: item.os_local,
        valor_total_nota: item.valor_total_nota || 0,
        itens: []
      };
    }
    nfsMap[key].itens.push(item);
  });

  const nfsList = Object.entries(nfsMap).sort((a, b) => new Date(b[1].data_nf) - new Date(a[1].data_nf));

  const toggleNF = (key) => setExpandedNFs(prev => ({ ...prev, [key]: !prev[key] }));
  const temFiltroAtivo = filtroOS || filtroNF || filtroLocal !== "todos" || filtroDataInicio || filtroDataFim;
  
  const limparFiltros = () => {
    setFiltroOS(""); setFiltroNF(""); setFiltroLocal("todos");
    setFiltroDataInicio(""); setFiltroDataFim("");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-blue-600" />
      <p className="text-gray-500 font-medium font-sans">Carregando base de materiais...</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="w-12 h-12 bg-[#1a2e4a] rounded-xl flex items-center justify-center shadow-lg">
          <Package className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] tracking-tight font-sans">Controle de Materiais</h1>
          <p className="text-sm text-gray-500 font-medium">Itens extraídos por IA vinculados às ordens de serviço</p>
        </div>
      </div>

      <Card className="bg-white/50 border-none shadow-sm">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end font-sans">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-400 uppercase">OS</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-300" />
              <Input value={filtroOS} onChange={e => setFiltroOS(e.target.value)} placeholder="024.2025" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-400 uppercase">NF</Label>
            <Input value={filtroNF} onChange={e => setFiltroNF(e.target.value)} placeholder="000.000.117" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-400 uppercase">Local</Label>
            <Select value={filtroLocal} onValueChange={setFiltroLocal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os locais</SelectItem>
                {LOCAIS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={limparFiltros} disabled={!temFiltroAtivo} className="font-bold">
            <X className="w-4 h-4 mr-2" /> Limpar Filtros
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {nfsList.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-sans">Nenhum registro encontrado.</div>
        ) : (
          nfsList.map(([key, nf]) => (
            <Card key={key} className="overflow-hidden border-none shadow-sm">
              <button onClick={() => toggleNF(key)} className="w-full text-left p-4 hover:bg-gray-50 transition-colors font-sans">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-blue-600">
                      {expandedNFs[key] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-[#1a2e4a]">NF {nf.numero_nf}</div>
                      <div className="text-xs text-gray-500">
                        OS <span className="text-blue-600 font-bold">{nf.os_numero || "—"}</span> • {nf.os_local || "Local não informado"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Valor Total da Nota</div>
                    <div className="text-lg font-black text-[#1a2e4a]">{fmt(nf.valor_total_nota)}</div>
                  </div>
                </div>
              </button>

              {expandedNFs[key] && (
                <div className="border-t bg-gray-50/50 p-4 overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead>
                      <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b">
                        <th className="pb-2">Descrição</th>
                        <th className="pb-2 text-center">UN</th>
                        <th className="pb-2 text-right">Qtd</th>
                        <th className="pb-2 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {nf.itens.map((item, i) => (
                        <tr key={i} className="hover:bg-white/50">
                          <td className="py-2.5 font-medium text-gray-700">{item.descricao}</td>
                          <td className="py-2.5 text-center text-gray-500 font-bold">{item.unidade}</td>
                          <td className="py-2.5 text-right text-gray-600">{fmtNum(item.quantidade)}</td>
                          <td className="py-2.5 text-right font-bold text-[#1a2e4a]">{fmt(item.valor_total_item)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}