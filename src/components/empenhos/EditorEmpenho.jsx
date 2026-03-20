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
        base44.entities.NotaEmpenho.list("-created_date"),
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
      ? { numero: contrato.numero, empresa: contrato.contratada }
      : { numero: "Não vinculado", empresa: "N/A" };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading("IA analisando PDF do SIAFI...");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_empenho: { type: "string" },
            ptres: { type: "string" },
            natureza_despesa: { type: "string" },
            subelemento: { type: "string" },
            valor_total: { type: "number" }
          }
        }
      });

      if (result.status === "success" && result.output) {
        setEmpenhoParaEditar({
          ...result.output,
          valor_saldo: result.output.valor_total,
          ano: new Date().getFullYear()
        });
        setModalOpen(true);
        toast.success("Dados extraídos!", { id: toastId });
      }
    } catch (e) {
      toast.error("Falha na extração do PDF.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
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

  if (loading) return <div className="flex h-96 items-center justify-center flex-col gap-2 font-bold text-gray-400">Sincronizando...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] uppercase tracking-tight">Notas de Empenho</h1>
          <p className="text-sm text-blue-900 font-bold uppercase mt-1">JFRN - Controle Orçamentário</p>
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
            className="w-full pl-10 h-10 text-xs border border-gray-200 rounded-md outline-none"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
          <SelectTrigger className="w-72 h-10 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3" />
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
            <TableRow className="text-[10px] uppercase font-bold">
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
                <TableRow key={e.id} className="hover:bg-blue-50/20">
                  <TableCell>
                    <div className="font-black text-[#1a2e4a] text-sm uppercase">{e.numero_empenho}</div>
                    <div className="flex flex-col gap-1 mt-1 text-[10px] font-bold uppercase">
                      <span className="text-amber-700">Contrato: {contratoInfo.numero}</span>
                      <span className="text-gray-500">{contratoInfo.empresa}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] font-bold text-blue-800">PTRES: {e.ptres}</div>
                    <Badge variant="outline" className="text-[8px] uppercase mt-1">
                      {NOMES_NATUREZA[e.natureza_despesa] || e.natureza_despesa}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] font-bold uppercase text-gray-700">{e.responsavel_alteracao || "Leonardo P. Silva"}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      {e.data_ultima_alteracao ? new Date(e.data_ultima_alteracao).toLocaleString("pt-BR") : "Original"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-500 text-xs">{fmt(e.valor_total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-black text-[#1a2e4a]">{fmt(e.valor_saldo)}</div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEmpenhoParaEditar(e); setModalOpen(true); }}>
                      <TrendingUp size={14} className="text-blue-600" />
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
        />
      )}
    </div>
  );
}