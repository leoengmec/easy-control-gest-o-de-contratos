import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Package, Search, X } from "lucide-react";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const LOCAIS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

export default function ControleMateriais() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNFs, setExpandedNFs] = useState({});

  const [filtroOS, setFiltroOS] = useState("");
  const [filtroNF, setFiltroNF] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  useEffect(() => {
    base44.entities.ItemMaterialNF.list("-created_date", 500)
      .then(setItens)
      .finally(() => setLoading(false));
  }, []);

  const itensFiltrados = itens.filter(item => {
    const osOk    = !filtroOS    || (item.os_numero || "").toLowerCase().includes(filtroOS.toLowerCase());
    const nfOk    = !filtroNF    || (item.numero_nf || "").toLowerCase().includes(filtroNF.toLowerCase());
    const localOk = filtroLocal === "todos" || item.os_local === filtroLocal;
    return osOk && nfOk && localOk;
  });

  // Agrupar por número da NF
  const nfsMap = {};
  itensFiltrados.forEach(item => {
    const key = item.numero_nf || "(sem NF)";
    if (!nfsMap[key]) {
      nfsMap[key] = {
        numero_nf: item.numero_nf,
        data_nf: item.data_nf,
        os_numero: item.os_numero,
        os_local: item.os_local,
        valor_total_nota: item.valor_total_nota,
        itens: []
      };
    }
    nfsMap[key].itens.push(item);
  });

  const nfsList = Object.entries(nfsMap);

  const toggleNF = (key) => {
    setExpandedNFs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const limparFiltros = () => {
    setFiltroOS("");
    setFiltroNF("");
    setFiltroLocal("todos");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Controle de Compra de Materiais</h1>
          <p className="text-sm text-gray-500">Itens extraídos das notas fiscais de material</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Número da OS</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={filtroOS}
                  onChange={e => setFiltroOS(e.target.value)}
                  placeholder="Filtrar por OS..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número da NF</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={filtroNF}
                  onChange={e => setFiltroNF(e.target.value)}
                  placeholder="Filtrar por NF..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Local de Prestação</Label>
              <Select value={filtroLocal} onValueChange={setFiltroLocal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os locais</SelectItem>
                  {LOCAIS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(filtroOS || filtroNF || filtroLocal !== "todos") && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-xs text-gray-500 gap-1">
                <X className="w-3 h-3" /> Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="text-sm text-gray-500">
        {nfsList.length} nota(s) encontrada(s) · {itensFiltrados.length} item(ns)
      </div>

      {nfsList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum item de material encontrado.</p>
            <p className="text-xs mt-1">Os itens são extraídos automaticamente ao importar um PDF de nota fiscal de material.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {nfsList.map(([key, nf]) => (
            <Card key={key} className="overflow-hidden">
              {/* Cabeçalho da NF */}
              <button
                className="w-full text-left"
                onClick={() => toggleNF(key)}
              >
                <CardHeader className="py-3 px-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {expandedNFs[key]
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1a2e4a]">NF {nf.numero_nf || "—"}</span>
                          {nf.data_nf && (
                            <span className="text-xs text-gray-500">
                              {new Date(nf.data_nf + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {nf.os_numero && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              OS {nf.os_numero}
                            </Badge>
                          )}
                          {nf.os_local && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                              {nf.os_local}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{nf.itens.length} item(ns)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Valor Total da Nota</div>
                      <div className="font-bold text-[#1a2e4a]">{fmt(nf.valor_total_nota)}</div>
                    </div>
                  </div>
                </CardHeader>
              </button>

              {/* Itens da NF */}
              {expandedNFs[key] && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-t border-b">
                          <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Descrição do Produto/Serviço</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600 text-xs w-16">UN</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs w-24">Quant.</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs w-32">Valor Unit.</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs w-32">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nf.itens.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-gray-800">{item.descricao}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600">{item.unidade || "—"}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{fmtNum(item.quantidade)}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.valor_unitario)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-[#1a2e4a]">{fmt(item.valor_total_item)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 border-t">
                          <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-[#1a2e4a]">
                            TOTAL DA NOTA:
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-[#1a2e4a]">
                            {fmt(nf.valor_total_nota)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}