import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Loader2, Filter, Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import EditorEmpenho from "@/components/empenhos/EditorEmpenho"; // Certifique-se de criar este arquivo

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Empenhos() {
  const [empenhos, setEmpenhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("todos");
  
  // Estados para Edição/Reforço
  const [empenhoParaEditar, setEmpenhoParaEditar] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Tenta carregar da entidade NotaEmpenho
      const res = await base44.entities.NotaEmpenho.list();
      setEmpenhos(res || []);
    } catch (error) {
      console.error("Erro ao carregar empenhos:", error);
      toast.error("Erro de conexão com a entidade NotaEmpenho.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const empenhosFiltrados = empenhos.filter(e => {
    const matchBusca = e.numero_empenho?.toLowerCase().includes(busca.toLowerCase());
    const matchNatureza = filtroNatureza === "todos" || e.natureza_despesa === filtroNatureza;
    return matchBusca && matchNatureza;
  });

  if (loading) return (
    <div className="flex h-96 items-center justify-center flex-col gap-2">
      <Loader2 className="animate-spin text-[#1a2e4a]" />
      <span className="text-xs font-bold text-gray-400 uppercase">Sincronizando SIAFI...</span>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] uppercase tracking-tight">Notas de Empenho</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Controle de Disponibilidade Orçamentária</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-[10px] font-bold uppercase border-[#1a2e4a] text-[#1a2e4a]">
            <Upload className="w-3 h-3 mr-2" /> Escanear NE
          </Button>
          <Button className="bg-[#1a2e4a] text-[10px] font-bold uppercase shadow-lg">
            <Plus className="w-3 h-3 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* Barra de Busca e Filtro por Natureza de Despesa [cite: 104, 138] */}
      <div className="flex gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            placeholder="Filtrar por número da NE..." 
            className="pl-10 h-10 text-xs border-gray-200"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
          <SelectTrigger className="w-64 h-10 text-xs">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Natureza da Despesa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as Naturezas</SelectItem>
            <SelectItem value="339030">339030 - Material [cite: 61]</SelectItem>
            <SelectItem value="339039">339039 - Serviços [cite: 138]</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="text-[10px] uppercase font-bold text-gray-500">
              <TableHead>Identificação SIAFI</TableHead>
              <TableHead>Célula Orçamentária [cite: 27, 104]</TableHead>
              <TableHead className="text-right">V. Empenhado</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empenhosFiltrados.map((e) => (
              <TableRow key={e.id} className="hover:bg-blue-50/20">
                <TableCell>
                  <div className="font-black text-[#1a2e4a]">{e.numero_empenho}</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase">Exercício {e.ano}</div>
                </TableCell>
                <TableCell>
                  <div className="text-[10px] font-bold text-blue-700">PTRES: {e.ptres}</div>
                  <Badge variant="outline" className="text-[9px] mt-1 bg-gray-50 text-gray-600">
                    ND: {e.natureza_despesa} [cite: 138] (Sub: {e.subelemento}) [cite: 139]
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-gray-400 text-xs">
                  {fmt(e.valor_total)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm font-black text-[#1a2e4a]">{fmt(e.valor_saldo)}</div>
                  <div className="w-24 ml-auto bg-gray-100 h-1 mt-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${e.valor_saldo < (e.valor_total * 0.1) ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${(e.valor_saldo / e.valor_total) * 100}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600"
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
      </div>

      {/* Modal de Reforço e Edição */}
      {empenhoParaEditar && (
        <EditorEmpenho 
          empenho={empenhoParaEditar}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={carregarDados}
          user={null} // Passar o user do AuthContext aqui
        />
      )}
    </div>
  );
}