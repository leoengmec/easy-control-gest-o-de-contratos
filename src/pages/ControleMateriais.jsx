import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Package, FileText, MapPin, Calculator, Download } from "lucide-react";
import { toast } from "sonner";

export default function ControleMateriais() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [contratos, setContratos] = useState([]);

  const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const fmtData = (d) => d ? new Date(d).toLocaleDateString("pt-BR") : "---";

  useEffect(() => {
    loadDados();
  }, []);

  const loadDados = async () => {
    setLoading(true);
    try {
      const [resItens, resContratos] = await Promise.all([
        base44.entities.ItemMaterialNF.list("-created_date"),
        base44.entities.Contrato.list()
      ]);
      setItens(resItens || []);
      setContratos(resContratos || []);
    } catch (error) {
      toast.error("Erro ao carregar dados de materiais.");
    } finally {
      setLoading(false);
    }
  };

  const itensFiltrados = itens.filter(item => {
    const matchBusca = 
      item.os_numero?.toLowerCase().includes(busca.toLowerCase()) ||
      item.numero_nf?.toLowerCase().includes(busca.toLowerCase()) ||
      item.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      item.os_local?.toLowerCase().includes(busca.toLowerCase());
    
    const matchContrato = filtroContrato === "todos" || String(item.contrato_id) === filtroContrato;
    
    return matchBusca && matchContrato;
  });

  const totalGeral = itensFiltrados.reduce((acc, curr) => acc + (curr.valor_total_item || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] uppercase tracking-tighter flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" /> Controle de Materiais e OS
          </h1>
          <p className="text-sm text-gray-500 font-medium">Gestão detalhada de itens extraídos via NF</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase" onClick={loadDados}>
            Atualizar Base
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase gap-2">
            <Download size={14} /> Exportar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Calculator size={20}/></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-blue-600">Total em Itens</p>
              <p className="text-lg font-black text-[#1a2e4a]">{fmtBRL(totalGeral)}</p>
            </div>
          </CardContent>
        </Card>
        {/* Outros cards de resumo aqui */}
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Buscar por OS, NF, Local ou Descrição..." 
                className="pl-9 h-10 text-sm border-slate-300"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <select 
              className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
            >
              <option value="todos">Todos os Contratos</option>
              {contratos.map(c => (
                <option key={c.id} value={String(c.id)}>{c.numero} - {c.contratada?.substring(0, 15)}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase">Data/NF</TableHead>
                <TableHead className="text-[10px] font-black uppercase">OS / Local</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Descrição do Item</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Qtd/Un</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">V. Unitário</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Total Item</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400 font-bold uppercase animate-pulse">Carregando Materiais...</TableCell></TableRow>
              ) : itensFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Nenhum item encontrado.</TableCell></TableRow>
              ) : (
                itensFiltrados.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1a2e4a]">{item.numero_nf}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{fmtData(item.data_nf)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[9px] font-black bg-blue-50 text-blue-700 border-blue-200 uppercase">
                          OS: {item.os_numero || "N/A"}
                        </Badge>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium italic">
                          <MapPin size={10} /> {item.os_local || "Local não informado"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-[11px] text-gray-700 font-medium leading-relaxed line-clamp-2">
                        {item.descricao}
                      </p>
                    </TableCell>
                    <TableCell className="text-center font-bold text-gray-600">
                      {item.quantidade} <span className="text-[9px] text-gray-400">{item.unidade}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[11px]">{fmtBRL(item.valor_unitario)}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-black text-[#1a2e4a] font-mono">{fmtBRL(item.valor_total_item)}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}