import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Loader2, Filter, TrendingUp, User, Clock } from "lucide-react";
import { toast } from "sonner";
import EditorEmpenho from "@/components/empenhos/EditorEmpenho";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Mapeamento para evitar "Dados Crus" do Banco de Dados 
const NOMES_NATUREZA = {
  "339030": "339030 - Material de Consumo",
  "339039": "339039 - Outros Serviços de Terceiros"
};

const NOMES_SUBELEMENTO = {
  "24": "24 - Material p/ Manutenção de Bens Imóveis",
  "17": "17 - Manut. e Conserv. de Máquinas e Equipamentos"
};

export default function Empenhos() {
  const [empenhos, setEmpenhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("todos");
  
  const [empenhoParaEditar, setEmpenhoParaEditar] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.NotaEmpenho.list();
      setEmpenhos(res || []);
    } catch (error) {
      toast.error("Erro ao carregar dados da entidade NotaEmpenho.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const empenhosFiltrados = empenhos.filter(e => {
    const matchBusca = e.numero_empenho?.toLowerCase().includes(busca.toLowerCase());
    const matchNatureza = filtroNatureza === "todos" || String(e.natureza_despesa) === filtroNatureza;
    return matchBusca && matchNatureza;
  });

  if (loading) return (
    <div className="flex h-96 items-center justify-center flex-col gap-2">
      <Loader2 className="animate-spin text-[#1a2e4a]" />
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sincronizando SIAFI...</span>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] uppercase tracking-tight">Notas de Empenho</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Justiça Federal de Primeiro Grau - RN [cite: 13, 90]</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-[10px] font-bold uppercase border-[#1a2e4a] text-[#1a2e4a] h-10">
            <Upload className="w-3 h-3 mr-2" /> Escanear PDF SIAFI [cite: 3, 56, 80]
          </Button>
          <Button className="bg-[#1a2e4a] text-[10px] font-bold uppercase shadow-lg h-10">
            <Plus className="w-3 h-3 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            placeholder="Filtrar por número da NE (Ex: 17, 18)..." 
            className="w-full pl-10 h-10 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        
        <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
          <SelectTrigger className="w-72 h-10 text-xs border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-gray-400" />
              <SelectValue placeholder="Natureza da Despesa" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as Naturezas</SelectItem>
            {Object.entries(NOMES_NATUREZA).map(([cod, nome]) => (
              <SelectItem key={cod} value={cod}>{nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="text-[10px] uppercase font-bold text-gray-500">
              <TableHead>Identificação SIAFI</TableHead>
              <TableHead>Célula Orçamentária [cite: 26, 103]</TableHead>
              <TableHead>Histórico de Revisão</TableHead>
              <TableHead className="text-right">V. Empenhado</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empenhosFiltrados.map((e) => (
              <TableRow key={e.id} className="hover:bg-blue-50/20 transition-colors">
                <TableCell>
                  <div className="font-black text-[#1a2e4a] text-sm">{e.numero_empenho}</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Exercício {e.ano || "2026"} [cite: 25, 102]</div>
                </TableCell>
                
                <TableCell>
                  <div className="text-[10px] font-bold text-blue-800">PTRES: {e.ptres || "168312"} [cite: 27, 104]</div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <Badge variant="outline" className="text-[8px] bg-gray-50 text-gray-600 border-gray-200 w-fit h-4 px-1">
                      {NOMES_NATUREZA[e.natureza_despesa] || `ND: ${e.natureza_despesa}`} [cite: 61, 138]
                    </Badge>
                    <span className="text-[8px] text-gray-400 font-bold ml-1 uppercase">
                      {NOMES_SUBELEMENTO[e.subelemento] || `Subelemento: ${e.subelemento}`} [cite: 62, 139]
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-700 font-bold">
                      <div className="w-5 h-5 rounded-full bg-[#1a2e4a] text-white flex items-center justify-center text-[8px]">
                        {e.responsavel_alteracao?.charAt(0) || "L"}
                      </div>
                      {e.responsavel_alteracao || "Leonardo Pereira da Silva"} [cite: 72, 151]
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                      <Clock size={10} /> {e.data_ultima_alteracao ? new Date(e.data_ultima_alteracao).toLocaleString("pt-BR") : "Registro Original"} [cite: 74, 153]
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-right font-bold text-gray-500 text-xs">
                  {fmt(e.valor_total)} [cite: 28, 105]
                </TableCell>

                <TableCell className="text-right">
                  <div className="text-sm font-black text-[#1a2e4a]">{fmt(e.valor_saldo)}</div>
                  <div className="w-24 ml-auto bg-gray-100 h-1 mt-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${e.valor_saldo < (e.valor_total * 0.1) ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((e.valor_saldo / e.valor_total) * 100, 100)}%` }}
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      setEmpenhoParaEditar(e);
                      setModalOpen(true);
                    }}
                  >
                    <TrendingUp size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {empenhosFiltrados.length === 0 && (
          <div className="p-16 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            Nenhuma Nota de Empenho localizada para os filtros aplicados.
          </div>
        )}
      </div>

      {empenhoParaEditar && (
        <EditorEmpenho 
          empenho={empenhoParaEditar}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={carregarDados}
          user={null} 
        />
      )}
    </div>
  );
}