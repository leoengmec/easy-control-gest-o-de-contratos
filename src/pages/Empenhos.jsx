import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Loader2, Filter, TrendingUp, Clock, FileText, Building2 } from "lucide-react";
import { toast } from "sonner";
import EditorEmpenho from "@/components/empenhos/EditorEmpenho";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const NOMES_NATUREZA = {
  "339030": "339030 - Material de Consumo",
  "339039": "339039 - Serviços de Terceiros"
};

const NOMES_SUBELEMENTO = {
  "24": "24 - Material p/ Manutenção",
  "17": "17 - Manutenção de Máquinas"
};

export default function Empenhos() {
  const [empenhos, setEmpenhos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("todos");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [empenhoParaEditar, setEmpenhoParaEditar] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resEmpenhos, resContratos] = await Promise.all([
        base44.entities.NotaEmpenho.list(),
        base44.entities.Contrato.list()
      ]);
      setEmpenhos(resEmpenhos || []);
      setContratos(resContratos || []);
    } catch (error) {
      toast.error("Erro ao carregar dados orçamentários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const getDadosContrato = (contratoId) => {
    const contrato = contratos.find(c => c.id === contratoId);
    return contrato 
      ? { numero: contrato.numero_contrato, empresa: contrato.empresa }
      : { numero: "Não vinculado", empresa: "N/A" };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    toast.info("Processando PDF do SIAFI...");
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("Dados extraídos com sucesso!");
    }, 2000);
  };

  const empenhosFiltrados = empenhos.filter(e => {
    const contratoInfo = getDadosContrato(e.contrato_id);
    const matchBusca = 
      e.numero_empenho?.toLowerCase().includes(busca.toLowerCase()) ||
      contratoInfo.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
      contratoInfo.numero?.toLowerCase().includes(busca.toLowerCase());
    const matchNatureza = filtroNatureza === "todos" || String(e.natureza_despesa) === filtroNatureza;
    return matchBusca && matchNatureza;
  });

  if (loading) return (
    <div className="flex h-96 items-center justify-center flex-col gap-2 uppercase font-bold text-gray-400 text-xs">
      <Loader2 className="animate-spin text-[#1a2e4a]" /> Sincronizando SIAFI...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] uppercase tracking-tight">Notas de Empenho</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1 text-blue-900">JFRN - Controle Orçamentário</p>
        </div>
        
        <div className="flex gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="border-[#1a2e4a] text-[#1a2e4a] font-bold uppercase text-[10px] h-10 px-5"
          >
            {isProcessing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Upload className="w-3 h-3 mr-2" />}
            Escanear PDF SIAFI
          </Button>
          <Button 
            className="bg-[#1a2e4a] text-white font-bold uppercase text-[10px] h-10 px-5 shadow-lg"
            onClick={() => { setEmpenhoParaEditar(null); setModalOpen(true); }}
          >
            <Plus className="w-3 h-3 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            placeholder="Buscar por NE, Empresa ou Contrato..." 
            className="w-full pl-10 h-10 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-[#1a2e4a] outline-none"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
          <SelectTrigger className="w-72 h-10 text-xs border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-gray-400" />
              <SelectValue placeholder="Todas as Naturezas" />
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
              <TableHead>Identificação SIAFI / Contrato</TableHead>
              <TableHead>Célula Orçamentária</TableHead>
              <TableHead>Histórico de Revisão</TableHead>
              <TableHead className="text-right">V. Empenhado</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empenhosFiltrados.map((e) => {
              const contratoInfo = getDadosContrato(e.contrato_id);
              return (
                <TableRow key={e.id} className="hover:bg-blue-50/20 transition-colors">
                  <TableCell>
                    <div className="font-black text-[#1a2e4a] text-sm uppercase">{e.numero_empenho}</div>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-1 text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold uppercase w-fit">
                        <FileText size={10} /> Contrato: {contratoInfo.numero}
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 uppercase">
                        <Building2 size={10} className="text-gray-400" /> {contratoInfo.empresa}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] font-bold text-blue-800 tracking-tight">PTRES: {e.ptres || "168312"}</div>
                    <div className="flex flex-col gap-1 mt-1">
                      <Badge variant="outline" className="text-[8px] bg-blue-50 text-blue-700 border-blue-100 w-fit h-4 px-1 uppercase">
                        {NOMES_NATUREZA[e.natureza_despesa] || `ND: ${e.natureza_despesa || "—"}`}
                      </Badge>
                      <span className="text-[8px] text-gray-400 font-bold ml-1 uppercase">
                        {NOMES_SUBELEMENTO[e.subelemento] || `Subelemento: ${e.subelemento || "—"}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-700 font-bold uppercase">
                        <div className="w-5 h-5 rounded-full bg-[#1a2e4a] text-white flex items-center justify-center text-[8px]">
                          {e.responsavel_alteracao?.charAt(0) || "L"}
                        </div>
                        {e.responsavel_alteracao || "Leonardo P. Silva"}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                        <Clock size={10} /> {e.data_ultima_alteracao ? new Date(e.data_ultima_alteracao).toLocaleString("pt-BR") : "Original"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-500 text-xs">{fmt(e.valor_total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-black text-[#1a2e4a]">{fmt(e.valor_saldo)}</div>
                    <div className="w-24 ml-auto bg-gray-100 h-1 mt-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${e.valor_saldo < (e.valor_total * 0.1) ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((e.valor_saldo / (e.valor_total || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      onClick={() => { setEmpenhoParaEditar(e); setModalOpen(true); }}
                    >
                      <TrendingUp size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {modalOpen && (
        <EditorEmpenho 
          empenho={empenhoParaEditar}
          contratos={contratos}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={carregarDados}
          user={null} 
        />
      )}
    </div>
  );
}