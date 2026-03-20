import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Upload, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function NotasEmpenho() {
  const [empenhos, setEmpenhos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filtros Avançados
  const [busca, setBusca] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("todos");

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resEmpenhos, resContratos] = await Promise.all([
          base44.entities.NotaEmpenho.list(),
          base44.entities.Contrato.list()
        ]);
        setEmpenhos(resEmpenhos || []);
        setContratos(resContratos || []);
      } catch (error) {
        toast.error("Erro ao sincronizar Notas de Empenho.");
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  // Lógica de Extração de Dados (Simulação de OCR/Parser de PDF SIAFI)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    toast.info("Processando Nota de Empenho SIAFI...");

    // Simulando a extração baseada nos campos das notas 17 e 18 enviadas
    setTimeout(() => {
      // Exemplo de dados extraídos da Nota 17/18
      const dadosExtraidos = {
        numero_empenho: "2026NE000017", // Extraído do campo 'Número' [cite: 102]
        ano: 2026, // Extraído do campo 'Ano' [cite: 102]
        ptres: "168312", // Extraído da Célula Orçamentária [cite: 104]
        natureza_despesa: "339039", // Extraído da Célula Orçamentária [cite: 104]
        subelemento: "17", // Extraído da Lista de Itens [cite: 139]
        valor_total: 2200.00, // Extraído do campo 'Valor' 
        processo_sei: "0002596-20.2020", // Extraído do campo 'Processo' 
        favorecido_cnpj: "02.474.174/0001-11" // Extraído de 'Favorecido' [cite: 109]
      };

      setIsProcessing(false);
      toast.success("Dados extraídos com sucesso! Verifique o formulário.");
      console.log("Dados prontos para o BD:", dadosExtraidos);
      
      // Aqui você abriria o Modal de Cadastro com os campos preenchidos
    }, 2000);
  };

  const empenhosFiltrados = empenhos.filter(e => {
    const matchBusca = e.numero_empenho?.toLowerCase().includes(busca.toLowerCase());
    const matchNatureza = filtroNatureza === "todos" || e.natureza_despesa === filtroNatureza;
    return matchBusca && matchNatureza;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] uppercase tracking-tight">Notas de Empenho</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">SIAFI | Auditoria Orçamentária JFRN</p>
        </div>
        
        <div className="flex gap-3">
          {/* Botão de Upload Invisível */}
          <input type="file" id="upload-ne" className="hidden" accept=".pdf" onChange={handleFileUpload} />
          <Button 
            variant="outline" 
            className="border-[#1a2e4a] text-[#1a2e4a] font-bold uppercase text-xs"
            onClick={() => document.getElementById('upload-ne').click()}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Escanear PDF SIAFI
          </Button>
          
          <Button className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold uppercase text-xs">
            <Plus className="mr-2 h-4 w-4" /> Novo Registro Manual
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Inteligentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            placeholder="Buscar por NE..." 
            className="pl-10 h-10 text-xs border-gray-200"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        
        <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
          <SelectTrigger className="h-10 text-xs border-gray-200">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Natureza da Despesa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as Naturezas</SelectItem>
            <SelectItem value="339030">339030 - Material de Consumo</SelectItem>
            <SelectItem value="339039">339039 - Serviços de Terceiros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Auditoria Expandida */}
      <div className="rounded-xl border shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="text-[11px] uppercase font-bold text-gray-600">
              <TableHead>Número / SIAFI</TableHead>
              <TableHead>PTRES / Natureza</TableHead>
              <TableHead>Processo SEI</TableHead>
              <TableHead className="text-right">Total Empenhado</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empenhosFiltrados.map((e) => (
              <TableRow key={e.id} className="hover:bg-blue-50/30 transition-colors">
                <TableCell>
                  <div className="font-black text-[#1a2e4a]">{e.numero_empenho}</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase">Exercício {e.ano}</div>
                </TableCell>
                <TableCell>
                  <div className="text-[10px] font-bold text-blue-700">PTRES: {e.ptres}</div>
                  <Badge variant="outline" className="text-[9px] mt-1 bg-gray-50">
                    ND: {e.natureza_despesa} (Sub: {e.subelemento})
                  </Badge>
                </TableCell>
                <TableCell className="text-[11px] font-medium text-gray-600">
                  {e.processo_sei}
                </TableCell>
                <TableCell className="text-right font-bold text-gray-500">
                  {fmt(e.valor_total)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm font-black text-[#1a2e4a]">{fmt(e.valor_saldo)}</div>
                  <div className="bg-green-100 h-1 mt-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${(e.valor_saldo / e.valor_total) * 100}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}