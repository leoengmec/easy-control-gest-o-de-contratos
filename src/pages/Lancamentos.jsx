import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importação faltante
import { toast } from "sonner";
import { Loader2, FileSearch, Upload, Wallet } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Configuração do Worker Nativo
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contratos, setContratos] = useState([]);
  
  // Estado para capturar o contrato selecionado no Modal
  const [contratoId, setContratoId] = useState("");
  
  // Estado dos dados extraídos/editáveis
  const [dados, setDados] = useState({
    numero_nf: "",
    data_nf: "01/03/2026", // Default para exemplo
    valor_total: 0,
    os_numero: "",
    descricao: ""
  });

  // Carrega contratos ao abrir a página
  useEffect(() => {
    base44.entities.Contrato.list().then(setContratos).catch(console.error);
  }, []);

  // 💰 Requisito 6: Lógica "Centavos First"
  const handleMoneyInput = (val) => {
    const clean = val.replace(/\D/g, "");
    setDados({ ...dados, valor_total: Number(clean) });
  };

  const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

  // 📄 Motor de Extração de PDF (Regex Calibrado JFRN)
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

        console.log("Texto Bruto Extraído:", text); // Verificação no console

        // 🔍 CALIBRAGEM DE REGEX (Baseado na Imagem 4)
        
        // 1. Número da NF
        const nf = text.match(/NF\s*[:\-\s]*(\d+)/i)?.[1] || "";
        
        // 2. Data de Emissão (DD/MM/AAAA)
        const data = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
        
        // 3. VALOR (Refinado para pegar R$ ou apenas o valor no final da NF)
        const valorMatch = text.match(/(?:TOTAL|VALOR|R\$)\s*[:\-\s]*([\d\.,]+)/i);
        
        // 4. OS (Refinado: Busca 'OS' e pega apenas os próximos 15 caracteres para evitar parágrafos)
        const osMatch = text.match(/(?:OS|Ordem de Serviço)[:\-\s]*([A-Z0-9\-\/]+)/i);

        setDados({
          ...dados,
          numero_nf: nf,
          data_nf: data,
          os_numero: osMatch ? osMatch[1].trim() : "", // Captura limpa
          valor_total: valorMatch ? parseFloat(valorMatch[1].replace(".", "").replace(",", ".")) * 100 : 0,
          descricao: text.substring(0, 150)
        });
        toast.success("Dados extraídos do PDF!");
      } catch (e) { toast.error("Erro na leitura do PDF."); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const salvar = async () => {
    // Validação Obrigatória
    if (!contratoId) return toast.error("⚠️ Selecione o contrato.");
    if (!dados.numero_nf) return toast.error("⚠️ Número da NF é obrigatório.");
    if (!dados.data_nf.includes('/')) return toast.error("⚠️ Formato de data inválido.");

    try {
      setLoading(true); // Muda o botão para "Salvando..."

      // 🔄 CONVERSÃO FORÇADA DE DATA (DD/MM/AAAA -> YYYY-MM-DD)
      const [d, m, a] = dados.data_nf.split("/");
      const dataISO = `${a}-${m}-${d}`;

      // 1. Grava no Financeiro (Pai)
      const lanc = await base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoId,
        valor: dados.valor_total / 100, // Salva em Float (ex: 1250.00)
        numero_nf: dados.numero_nf,
        data_nf: dataISO, // Formato correto para o banco
        status: "Em instrução",
        responsavel_por_lancamento: user?.nome
      });

      // 2. Grava no Controle de Materiais (Detalhe)
      await base44.entities.ItemMaterialNF.create({
        lancamento_financeiro_id: lanc.id,
        contrato_id: contratoId,
        numero_nf: dados.numero_nf,
        data_nf: dataISO,
        os_numero: dados.os_numero,
        descricao: dados.descricao || `Item da NF ${dados.numero_nf}`,
        valor_total_nota: dados.valor_total / 100,
        unidade: "UN",
        quantidade: 1
      });

      toast.success("✅ Lançamento e Material registrados com sucesso!");
      setIsModalOpen(false); // Fecha o modal
      // Limpa os dados para o próximo
      setDados({ numero_nf: "", data_nf: "01/03/2026", valor_total: 0, os_numero: "", descricao: "" });
      setContratoId("");
      
    } catch (e) {
      console.error("Erro ao salvar:", e);
      // Aqui o Base44 deve retornar o erro específico (ex: campo inválido)
      toast.error(`❌ Falha ao gravar dados: ${e.message || "Verifique os Logs no painel"}`);
    } finally { setLoading(false); } // Volta o botão ao normal
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Cabeçalho da Página (Imagem 1) */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] uppercase tracking-tighter">Lançamentos Financeiros</h1>
          <p className="text-gray-500 text-sm">Extração inteligente de faturas (PDF)</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-900 hover:bg-blue-800 uppercase font-black text-[10px] px-6 h-12 shadow-lg">
          <Upload className="mr-2 h-4 w-4" /> Novo Lançamento (PDF)
        </Button>
      </div>

      {/* Caixa de Diálogo (Imagem 2, 3 e 4) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-t-8 border-blue-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase font-black text-blue-900">
              <FileSearch /> Processar Nota Fiscal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. Seleção de Contrato Obrigatória (Ajustado) */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-gray-400">1. Selecione o Contrato</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger className="h-12 border-slate-300">
                  <SelectValue placeholder="Escolha o contrato para vincular a NF" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.numero} / {c.orgao || "JFRN"} - {c.contratada?.substring(0, 30)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dropzone PDF */}
            <div className="border-2 border-dashed border-slate-200 p-10 text-center rounded-xl bg-slate-50 hover:bg-blue-50 transition-all group relative">
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
                <Input value={dados.data_nf} placeholder="17/12/2025" onChange={e => setDados({...dados, data_nf: e.target.value})} />
              </div>
            </div>

            {/* Valor Bruto (Requisito 6) */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-blue-700">Valor Bruto (Auto-preenchimento)</Label>
              <Input 
                className="text-xl font-mono font-black text-blue-900 h-14" 
                value={fmtBRL(dados.valor_total)} 
                onChange={e => handleMoneyInput(e.target.value)} 
              />
            </div>

            {/* OS Identificada (Calibrado) */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">OS Identificada</Label>
              <Input 
                value={dados.os_numero} 
                placeholder="Ex: OS-123/2025"
                onChange={e => setDados({...dados, os_numero: e.target.value})} 
              />
            </div>
          </div>

          <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 rounded-b-lg gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button 
              onClick={salvar} 
              disabled={loading} 
              className="bg-blue-900 hover:bg-blue-800 text-white uppercase font-black text-[10px] px-10 h-11 transition-all"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              {loading ? "Salvando..." : "Confirmar e Gravar Dados"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}