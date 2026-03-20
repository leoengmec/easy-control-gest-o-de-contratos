import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Loader2, Filter, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";
import EditorEmpenho from "@/components/empenhos/EditorEmpenho";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Empenhos() {
  const [empenhos, setEmpenhos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("todos");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [empenhoParaEditar, setEmpenhoParaEditar] = useState(null);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resEmp, resCon] = await Promise.all([
        base44.entities.NotaEmpenho.list("-created_date"),
        base44.entities.Contrato.list()
      ]);
      setEmpenhos(resEmp || []);
      setContratos(resCon || []);
    } catch (e) {
      toast.error("Erro ao sincronizar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading("IA JFRN: Lendo Nota de Empenho...");

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
        toast.success("Dados extraídos com sucesso!", { id: toastId });
      }
    } catch (e) {
      toast.error("Erro na leitura do PDF.", { id: toastId });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const empenhosFiltrados = empenhos.filter(e => {
    const contrato = contratos.find(c => c.id === e.contrato_id);
    const termo = busca.toLowerCase();
    return (
      e.numero_empenho?.toLowerCase().includes(termo) ||
      contrato?.contratada?.toLowerCase().includes(termo) ||
      contrato?.numero?.toLowerCase().includes(termo)
    ) && (filtroNatureza === "todos" || String(e.natureza_despesa) === filtroNatureza);
  });

  if (loading) return <div className="p-20 text-center font-black text-[#1a2e4a] animate-pulse">CARREGANDO EASY CONTROL...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] uppercase">Notas de Empenho</h1>
          <p className="text-xs font-bold text-blue-600 uppercase">Gestão Orçamentária JFRN</p>
        </div>
        <div className="flex gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="font-bold uppercase text-[10px] border-[#1a2e4a] text-[#1a2e4a]">
            {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 w-3 h-3" />} Escanear SIAFI
          </Button>
          <Button onClick={() => { setEmpenhoParaEditar(null); setModalOpen(true); }} className="bg-[#1a2e4a] font-black uppercase text-[10px]">
            <Plus className="mr-2 w-3 h-3" /> Novo Empenho
          </Button>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            placeholder="Buscar por NE, Empresa ou Contrato..." 
            className="w-full pl-10 h-10 text-xs border rounded-md outline-none focus:ring-1 focus:ring-[#1a2e4a]"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow className="text-[10px] font-black uppercase">
              <TableHead>Dados do Empenho</TableHead>
              <TableHead>Contrato Vinculado</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empenhosFiltrados.map((e) => {
              const c = contratos.find(con => con.id === e.contrato_id);
              return (
                <TableRow key={e.id} className="hover:bg-blue-50/30">
                  <TableCell>
                    <div className="font-black text-[#1a2e4a]">{e.numero_empenho}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">PTRES: {e.ptres} | ND: {e.natureza_despesa}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] font-bold text-amber-700 uppercase">{c?.numero || "SEM VÍNCULO"}</div>
                    <div className="text-[10px] font-medium text-gray-400 uppercase truncate max-w-[200px]">{c?.contratada || "N/A"}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-400 text-xs">{fmt(e.valor_total)}</TableCell>
                  <TableCell className="text-right font-black text-[#1a2e4a]">{fmt(e.valor_saldo)}</TableCell>
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