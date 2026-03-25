import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, FileSearch, Upload } from "lucide-react";

// ✅ IMPORTAÇÃO DO PACOTE INSTALADO PELO BASE44
import * as pdfjsLib from "pdfjs-dist";

// ✅ CONFIGURAÇÃO DO WORKER (Essencial para não travar a tela na leitura)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState("");

  // Estado dos dados extraídos/editáveis
  const [dados, setDados] = useState({
    numero_nf: "",
    data_nf: "", 
    valor_total: 0,
    os_numero: "",
    descricao: ""
  });

  // Carrega contratos para vincular o PDF
  useEffect(() => {
    base44.entities.Contrato.list().then(setContratos).catch(console.error);
  }, []);

  // 💰 Requisito 6: Lógica "Centavos First" (10 -> 0,10 | 125000 -> 1.250,00)
  const handleMoneyInput = (val) => {
    const clean = val.replace(/\D/g, "");
    setDados({ ...dados, valor_total: Number(clean) });
  };

  const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

  // 📄 Motor de Extração de PDF (Versão Refinada para JFRN)
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

        // EXIBE NO CONSOLE PARA DEBUG (F12 no navegador para ver)
        console.log("TEXTO EXTRAÍDO DO PDF:", text);

        // REGEX CALIBRADO (Mais abrangente para NF e Valor)
        const nf = text.match(/(?:Número|NF|Nota|Nº)\s*[:\-\s]*(\d+)/i)?.[1] || "";
        const data = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
        
        // Busca Valor após o cifrão ou termos de total
        const valorMatch = text.match(/(?:TOTAL|VALOR|R\$)\s*[:\-\s]*([\d\.,]+)/i);
        
        // OS - Pega apenas os primeiros 15 caracteres após o termo OS
        const osMatch = text.match(/(?:OS|Ordem de Serviço)[:\-\s]*([A-Z0-9\-\/]{3,15})/i);

        setDados({
          ...dados,
          numero_nf: nf,
          data_nf: data || "01/01/2026",
          os_numero: osMatch ? osMatch[1].trim() : "",
          valor_total: valorMatch ? parseFloat(valorMatch[1].replace(".", "").replace(",", ".")) * 100 : 0,
          descricao: text.substring(0, 150)
        });
        toast.success("Leitura concluída! Verifique os campos.");
      } catch (e) { 
        toast.error("Erro técnico na leitura do PDF."); 
      } finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const salvar = async () => {
    // 🚨 SEGURANÇA: Impede salvar se o contrato não foi selecionado no Select do Modal
    if (!contratoId) {
      toast.error("Por favor, selecione o contrato acima do campo de upload.");
      return;
    }

    try {
      setLoading(true);
      
      // Tratamento de data robusto
      let dataISO;
      try {
        const parts = dados.data_nf.split("/");
        dataISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } catch (e) {
        dataISO = new Date().toISOString().split('T')[0];
      }

      // 1. Grava no Financeiro
      const novoLancamento = await base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoId,
        valor: dados.valor_total / 100,
        numero_nf: String(dados.numero_nf),
        data_nf: dataISO,
        status: "Em instrução",
        responsavel_por_lancamento: user?.nome || "Leonardo"
      });

      // 2. Grava no Controle de Materiais (ItemMaterialNF)
      await base44.entities.ItemMaterialNF.create({
        lancamento_financeiro_id: novoLancamento.id,
        contrato_id: contratoId,
        numero_nf: String(dados.numero_nf),
        data_nf: dataISO,
        os_numero: dados.os_numero,
        descricao: dados.descricao || "Lançamento via PDF",
        valor_total_nota: dados.valor_total / 100,
        quantidade: 1,
        unidade: "UN"
      });

      toast.success("✅ Tudo pronto! Lançamento registrado.");
      setIsModalOpen(false); // FECHA O MODAL
      
    } catch (err) {
      console.error("ERRO CRÍTICO NO SAVE:", err);
      toast.error(`Erro ao salvar: ${err.message || 'Verifique se todos os campos estão preenchidos'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] uppercase">Lançamentos Financeiros</h1>
          <p className="text-gray-500 text-sm">Extração inteligente de faturas (PDF)</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-900 hover:bg-blue-800 uppercase font-black text-[10px] px-6 h-12 shadow-lg">
          <Upload className="mr-2 h-4 w-4" /> Novo Lançamento (PDF)
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-t-8 border-blue-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase font-black text-blue-900">
              <FileSearch /> Processar Nota Fiscal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Seleção de Contrato Obrigatória */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-gray-400">1. Selecione o Contrato</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger className="h-12 border-slate-300">
                  <SelectValue placeholder="Escolha o contrato para vincular a NF" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} - {c.contratada}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-slate-200 p-10 text-center rounded-xl bg-slate-50 hover:bg-blue-50 transition-all group">
              <input type="file" id="pdf" className="hidden" accept="application/pdf" onChange={(e) => handlePDF(e.target.files[0])} />
              <label htmlFor="pdf" className="cursor-pointer flex flex-col items-center gap-3">
                {loading ? <Loader2 className="animate-spin h-10 w-10 text-blue-900" /> : <Upload className="h-10 w-10 text-slate-300 group-hover:text-blue-500" />}
                <span className="text-xs font-bold uppercase text-slate-500">Arraste ou clique para processar o PDF</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Nº Nota Fiscal</Label>
                <Input value={dados.numero_nf} onChange={e => setDados({...dados, numero_nf: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Data Emissão (DD/MM/AAAA)</Label>
                <Input value={dados.data_nf} placeholder="01/03/2026" onChange={e => setDados({...dados, data_nf: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-blue-700">Valor Bruto (Auto-preenchimento)</Label>
              <Input 
                className="text-xl font-mono font-black text-blue-900 h-14" 
                value={fmtBRL(dados.valor_total)} 
                onChange={e => handleMoneyInput(e.target.value)} 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">OS Identificada</Label>
              <Input value={dados.os_numero} onChange={e => setDados({...dados, os_numero: e.target.value})} />
            </div>
          </div>

          <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 rounded-b-lg">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button onClick={salvar} disabled={loading || !dados.numero_nf || !contratoId} className="bg-blue-900 text-white uppercase font-black text-[10px] px-10 h-11">
              Confirmar e Gravar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}