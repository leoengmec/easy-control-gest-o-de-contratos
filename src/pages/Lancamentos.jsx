import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, FileSearch, Upload, Wallet } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Configuração do Worker (Necessário para o PDF.js funcionar no browser)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado dos dados extraídos/editáveis
  const [dados, setDados] = useState({
    numero_nf: "",
    data_nf: "", // Formato DD/MM/AAAA conforme pedido
    valor_total: 0,
    os_numero: "",
    os_local: "",
    descricao: ""
  });

  // 💰 Requisito 6: Lógica "Centavos First" (10 -> 0,10)
  const handleMoneyInput = (val) => {
    const clean = val.replace(/\D/g, "");
    setDados({ ...dados, valor_total: Number(clean) });
  };

  const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

  // 📄 Motor de Extração de PDF
  const handlePDF = async (file) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(s => s.str).join(" ");
        }

        // Regras de Negócio (Requisitos 3.1 e 3.2)
        const nf = text.match(/NF\s*[:\-\s]*(\d+)/i)?.[1] || "";
        const data = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
        const valorStr = text.match(/(?:TOTAL|VALOR|PRODUTOS)\s*[:\-\s]*R?\$\s*([\d\.,]+)/i)?.[1];
        const os = text.match(/(?:OS|Ordem de Serviço|DADOS ADICIONAIS|COMPLEMENTARES)\s*[:\-\s]*([^\n,]+)/i)?.[1] || "";

        setDados({
          ...dados,
          numero_nf: nf,
          data_nf: data,
          os_numero: os.trim(),
          valor_total: valorStr ? parseFloat(valorStr.replace(".", "").replace(",", ".")) * 100 : 0,
          descricao: text.substring(0, 150)
        });
        toast.success("Dados extraídos do PDF!");
      } catch (e) {
        toast.error("Erro na leitura do PDF.");
      } finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const salvar = async () => {
    try {
      setLoading(true);
      // Converte data de DD/MM/AAAA para ISO YYYY-MM-DD para o banco
      const [d, m, a] = dados.data_nf.split("/");
      const dataISO = `${a}-${m}-${d}`;

      // 1. Grava o Resumo Financeiro
      const lanc = await base44.entities.LancamentoFinanceiro.create({
        valor: dados.valor_total / 100,
        numero_nf: dados.numero_nf,
        data_nf: dataISO,
        status: "Em instrução",
        responsavel_por_lancamento: user?.nome
      });

      // 2. Grava o Detalhe para o Controle de Materiais (Requisito 3.3)
      await base44.entities.ItemMaterialNF.create({
        lancamento_financeiro_id: lanc.id,
        numero_nf: dados.numero_nf,
        data_nf: dataISO,
        os_numero: dados.os_numero,
        descricao: dados.descricao,
        valor_total_nota: dados.valor_total / 100
      });

      toast.success("Lançamento concluído!");
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Erro ao gravar dados.");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-[#1a2e4a] uppercase">Gestão de Lançamentos</h1>
        <Button onClick={() => setIsModalOpen(true)} className="bg-[#1a2e4a] uppercase font-bold text-xs">
          <Upload className="mr-2 h-4 w-4" /> Novo Lançamento por PDF
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl border-t-8 border-[#1a2e4a]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase font-black">
              <FileSearch className="text-blue-600" /> Extrair Dados da Nota Fiscal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-slate-200 p-8 text-center rounded-xl bg-slate-50 hover:border-blue-400 transition-all">
              <input type="file" id="pdf" className="hidden" accept="application/pdf" onChange={(e) => handlePDF(e.target.files[0])} />
              <label htmlFor="pdf" className="cursor-pointer flex flex-col items-center gap-3">
                {loading ? <Loader2 className="animate-spin h-8 w-8 text-blue-900" /> : <Upload className="h-8 w-8 text-slate-400" />}
                <span className="text-xs font-bold uppercase text-slate-500">Arraste ou clique para carregar o PDF</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Nº Nota Fiscal</Label>
                <Input value={dados.numero_nf} onChange={e => setDados({...dados, numero_nf: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Data (DD/MM/AAAA)</Label>
                <Input value={dados.data_nf} onChange={e => setDados({...dados, data_nf: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-blue-700">Valor (R$)</Label>
              <Input 
                className="text-lg font-mono font-bold" 
                value={fmtBRL(dados.valor_total)} 
                onChange={e => handleMoneyInput(e.target.value)} 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">OS Encontrada</Label>
              <Input value={dados.os_numero} onChange={e => setDados({...dados, os_numero: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button onClick={salvar} disabled={loading || !dados.numero_nf} className="bg-[#1a2e4a] text-white uppercase font-black text-[10px] px-8">
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}