import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, FileSearch, Upload, Package, PenTool, Plus, Trash2, AlertTriangle } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados de Apoio
  const [contratos, setContratos] = useState([]);
  const [itensDoContrato, setItensDoContrato] = useState([]);
  const [alertaEstouro, setAlertaEstouro] = useState({ open: false, diff: 0, nfVal: 0, osVal: 0 });
  
  // Estados do Formulário
  const [contratoId, setContratoId] = useState("");
  const [osValorPrevisto, setOsValorPrevisto] = useState(0); // Valor capturado da OS
  
  // Dados Header da NF
  const [dadosNF, setDadosNF] = useState({
    numero_nf: "", 
    data_nf: "", 
    valor_total: 0, 
    os_numero: "", 
    processo_sei: "",
  });

  // Itens da Tabela (Aglutinados ou Individuais)
  const [itensLancamento, setItensLancamento] = useState([]);

  useEffect(() => {
    base44.entities.Contrato.list().then(setContratos);
  }, []);

  // Busca itens do contrato
  useEffect(() => {
    if (contratoId) {
      base44.entities.ItemContrato.filter({ contrato_id: contratoId })
        .then(setItensDoContrato);
    }
  }, [contratoId]);

  const limparFormulario = () => {
    setContratoId("");
    setItensLancamento([]);
    setDadosNF({ numero_nf: "", data_nf: "", valor_total: 0, os_numero: "", processo_sei: "" });
    setOsValorPrevisto(0);
    setIsModalOpen(false);
  };

  // --- MOTOR DE EXTRAÇÃO PDF ---
  const extractPdfText = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const typedarray = new Uint8Array(reader.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(s => s.str).join(" ") + "\n";
          }
          resolve(text);
        } catch (e) { reject(e); }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processarPDF = async (file, tipo) => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await extractPdfText(file);
      console.log(`Texto extraído (${tipo}):`, text);

      if (tipo === 'NF') {
        // Regex NF
        const nfMatch = text.match(/(?:N°\.|Número)\s?(\d+)/i);
        const dataMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        const valorMatch = text.match(/(?:VALOR TOTAL DA NOTA|TOTAL:).*?R?\$\s*([\d\.,]+)/i);
        const osInNfMatch = text.match(/(?:Informações Complementares).*?(\d{3}[\./]\d{4}-[A-Z]{2})/is); // Flag s para multiline

        // Processamento de Itens (Aglutinação MOR)
        const novosItens = [];
        const linhas = text.split('\n'); // Tentar quebrar linhas se possível, senão analisar o texto todo
        
        // Lógica Simplificada de Aglutinação baseada em Keywords no texto completo
        // Como o PDFJS retorna texto corrido muitas vezes, vamos buscar ocorrências
        
        // MOR NATAL
        const keywordsNatal = ["AUXILIAR", "ARTIFICE", "ENGENHEIRO"];
        const hasNatal = text.toUpperCase().includes("NATAL");
        const ignoreNatal = text.toUpperCase().includes("SERVIÇOS DE AUXILIAR ADMINISTRATIVO NATAL");
        
        // MOR MOSSORO
        const hasMossoro = text.toUpperCase().includes("MOSSORÓ") || text.toUpperCase().includes("MOSSORO");
        
        // Se detectou palavras chaves de serviço, tenta aglutinar
        // OBS: Sem OCR estruturado, pegar valores individuais exatos por linha é difícil.
        // Vamos assumir que se é uma NF de serviço MOR, o valor total da nota vai para o item aglutinado.
        // Se houver mais detalhes, o usuário ajusta na tabela.
        
        let valorTotal = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", ".")) * 100 : 0;

        if (hasNatal && !ignoreNatal && keywordsNatal.some(k => text.toUpperCase().includes(k))) {
           novosItens.push({
             descricao: "MOR NATAL",
             quantidade: 1,
             valor_unitario: valorTotal,
             valor_total: valorTotal
           });
        } else if (hasMossoro && keywordsNatal.some(k => text.toUpperCase().includes(k))) {
           novosItens.push({
             descricao: "MOR MOSSORÓ",
             quantidade: 1,
             valor_unitario: valorTotal,
             valor_total: valorTotal
           });
        } else {
           // Item genérico se não aglutinou
           novosItens.push({
             descricao: "Serviço/Material Genérico (Edite)",
             quantidade: 1,
             valor_unitario: valorTotal,
             valor_total: valorTotal
           });
        }

        setDadosNF(prev => ({
          ...prev,
          numero_nf: nfMatch ? nfMatch[1] : prev.numero_nf,
          data_nf: dataMatch ? dataMatch[1] : prev.data_nf,
          valor_total: valorTotal,
          os_numero: osInNfMatch ? osInNfMatch[1] : prev.os_numero
        }));
        
        setItensLancamento(novosItens);
        toast.success("NF Processada! Verifique os dados.");

      } else if (tipo === 'OS') {
        // Regex OS
        const osMatch = text.match(/(\d{3}\/\d{4}-[A-Z]{2})/);
        // Tentar capturar valor total da OS (Padrão genérico, pode precisar de ajuste)
        const valorOSMatch = text.match(/(?:TOTAL|Valor Estimado|Valor).*?R?\$\s*([\d\.,]+)/i);
        
        if (osMatch) {
            setDadosNF(prev => ({ ...prev, os_numero: osMatch[1] }));
        }
        if (valorOSMatch) {
            const val = parseFloat(valorOSMatch[1].replace(/\./g, "").replace(",", ".")) * 100;
            setOsValorPrevisto(val);
            toast.success(`OS Processada. Valor Previsto: ${new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(val/100)}`);
        } else {
            toast.info("Número OS identificado, mas valor não encontrado.");
        }
      }

    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar PDF.");
    } finally {
      setLoading(false);
    }
  };

  // --- MANIPULAÇÃO DA TABELA DE ITENS ---
  const updateItem = (index, field, value) => {
    const novos = [...itensLancamento];
    novos[index][field] = value;
    // Recalcular total se mudar qtd ou unitario
    if (field === 'quantidade' || field === 'valor_unitario') {
        novos[index].valor_total = novos[index].quantidade * novos[index].valor_unitario;
    }
    setItensLancamento(novos);
    
    // Atualizar total da NF baseado nos itens? O usuário pode querer manter diferente.
    // Vamos somar para sugerir o total da nota
    const totalItens = novos.reduce((acc, i) => acc + i.valor_total, 0);
    setDadosNF(prev => ({ ...prev, valor_total: totalItens }));
  };

  const addItem = () => {
    setItensLancamento([...itensLancamento, { descricao: "Novo Item", quantidade: 1, valor_unitario: 0, valor_total: 0 }]);
  };

  const removeItem = (index) => {
    const novos = itensLancamento.filter((_, i) => i !== index);
    setItensLancamento(novos);
     const totalItens = novos.reduce((acc, i) => acc + i.valor_total, 0);
    setDadosNF(prev => ({ ...prev, valor_total: totalItens }));
  };

  // --- SALVAMENTO ---
  const handlePreSalvar = () => {
    if (!contratoId) return toast.error("Selecione o contrato.");
    if (dadosNF.valor_total === 0) return toast.error("O valor da NF não pode ser zero.");

    // Validação de Estouro
    if (osValorPrevisto > 0 && dadosNF.valor_total > osValorPrevisto) {
        setAlertaEstouro({
            open: true,
            diff: dadosNF.valor_total - osValorPrevisto,
            nfVal: dadosNF.valor_total,
            osVal: osValorPrevisto
        });
        return;
    }

    gravarNoBanco();
  };

  const gravarNoBanco = async () => {
    setLoading(true);
    try {
      const dataISO = dadosNF.data_nf.split("/").reverse().join("-");
      const agora = new Date().toISOString();

      // Criar o Lançamento Financeiro
      const lanc = await base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoId,
        numero_nf: dadosNF.numero_nf,
        data_nf: dataISO.length === 10 ? dataISO : agora.split("T")[0],
        valor: dadosNF.valor_total / 100,
        os_numero: dadosNF.os_numero, // Campo novo sugerido para guardar OS na entidade principal também se possível, ou confiar nos itens
        status: "Em instrução",
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        responsavel_por_lancamento: user?.full_name || user?.email,
        item_label: itensLancamento.length === 1 ? itensLancamento[0].descricao : "Múltiplos Itens"
      });

      // Criar Itens (Materiais/Serviços)
      for (const item of itensLancamento) {
          await base44.entities.ItemMaterialNF.create({
            lancamento_financeiro_id: lanc.id,
            contrato_id: contratoId,
            numero_nf: dadosNF.numero_nf,
            data_nf: dataISO.length === 10 ? dataISO : agora.split("T")[0],
            os_numero: dadosNF.os_numero,
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            valor_unitario: item.valor_unitario / 100,
            valor_total_item: item.valor_total / 100,
            valor_total_nota: dadosNF.valor_total / 100
          });
      }

      toast.success("Lançamento realizado com sucesso!");
      setAlertaEstouro({ open: false, diff: 0 });
      limparFormulario();

    } catch (e) {
      console.error(e);
      toast.error("Erro ao gravar. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Button onClick={() => setIsModalOpen(true)} className="bg-blue-900 font-black uppercase text-xs">
        <Upload className="mr-2 w-4 h-4" /> Novo Lançamento (PDF)
      </Button>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && limparFormulario()}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto border-t-8 border-blue-900">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-blue-900 flex items-center gap-2">
              <FileSearch /> Processar Nova Nota Fiscal
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            {/* COLUNA 1: UPLOADS E CONTRATO */}
            <div className="space-y-4 border-r pr-4">
               <Label className="text-xs font-black uppercase text-slate-500">1. Arquivos e Vínculo</Label>
               
               <div className="space-y-2">
                 <Label className="text-[10px] uppercase font-bold">Vincular Contrato</Label>
                 <Select value={contratoId} onValueChange={setContratoId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero}</SelectItem>)}</SelectContent>
                 </Select>
               </div>

               <div className="p-3 bg-blue-50 rounded border border-blue-100 space-y-2">
                 <Label className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-2"><Upload size={12}/> Upload Nota Fiscal (PDF)</Label>
                 <Input type="file" accept="application/pdf" className="h-8 text-[10px]" onChange={(e) => processarPDF(e.target.files[0], 'NF')} />
               </div>

               <div className="p-3 bg-amber-50 rounded border border-amber-100 space-y-2">
                 <Label className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-2"><Upload size={12}/> Upload Ordem de Serviço (PDF)</Label>
                 <Input type="file" accept="application/pdf" className="h-8 text-[10px]" onChange={(e) => processarPDF(e.target.files[0], 'OS')} />
               </div>
            </div>

            {/* COLUNA 2: DADOS IDENTIFICADOS */}
            <div className="space-y-4 border-r pr-4">
                <Label className="text-xs font-black uppercase text-slate-500">2. Dados Identificados</Label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase">Nº NF</Label>
                        <Input value={dadosNF.numero_nf} onChange={e => setDadosNF({...dadosNF, numero_nf: e.target.value})} className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase">Data Emissão</Label>
                        <Input value={dadosNF.data_nf} onChange={e => setDadosNF({...dadosNF, data_nf: e.target.value})} className="h-8" />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase">Nº Ordem de Serviço (OS)</Label>
                    <Input value={dadosNF.os_numero} onChange={e => setDadosNF({...dadosNF, os_numero: e.target.value})} className="h-8 bg-amber-50" />
                </div>
                
                <div className="p-3 bg-slate-100 rounded space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-slate-600">Valor Total da Nota</Label>
                    <Input 
                        value={(dadosNF.valor_total / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} 
                        onChange={e => {
                            const val = Number(e.target.value.replace(/\D/g, ""));
                            setDadosNF({...dadosNF, valor_total: val});
                        }}
                        className="font-mono font-black text-lg text-blue-800 text-right h-10" 
                    />
                    {osValorPrevisto > 0 && (
                        <div className="text-[9px] text-right font-bold text-amber-600">
                            Previsto na OS: {(osValorPrevisto / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                        </div>
                    )}
                </div>
            </div>

            {/* COLUNA 3: ITENS (TABELA EDITÁVEL) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase text-slate-500">3. Detalhamento de Itens</Label>
                    <Button size="sm" variant="outline" onClick={addItem} className="h-6 text-[10px]"><Plus size={10} className="mr-1"/> Add Item</Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden h-[300px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="h-8 bg-slate-50">
                                <TableHead className="text-[9px] font-black h-8">DESCRIÇÃO</TableHead>
                                <TableHead className="text-[9px] font-black h-8 w-16">VALOR</TableHead>
                                <TableHead className="text-[9px] font-black h-8 w-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itensLancamento.map((item, idx) => (
                                <TableRow key={idx} className="h-10">
                                    <TableCell className="p-1">
                                        <Input 
                                            value={item.descricao} 
                                            onChange={e => updateItem(idx, 'descricao', e.target.value)} 
                                            className="h-7 text-[10px] border-none shadow-none focus-visible:ring-0"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <Input 
                                            value={(item.valor_total / 100).toFixed(2)} 
                                            onChange={e => {
                                                 const val = Number(e.target.value.replace(/\D/g, ""));
                                                 updateItem(idx, 'valor_total', val);
                                                 updateItem(idx, 'valor_unitario', val / item.quantidade);
                                            }}
                                            className="h-7 text-[10px] font-mono text-right border-none shadow-none focus-visible:ring-0"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => removeItem(idx)}>
                                            <Trash2 size={12} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {itensLancamento.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-[10px] text-slate-400 py-4">Nenhum item identificado</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={limparFormulario} className="font-bold uppercase text-[10px]">Cancelar</Button>
            <Button onClick={handlePreSalvar} disabled={loading} className="bg-blue-900 font-black uppercase text-xs px-10">
              {loading ? <Loader2 className="animate-spin" /> : "Salvar Lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA DE ESTOURO ORÇAMENTÁRIO */}
      <AlertDialog open={alertaEstouro.open} onOpenChange={(o) => !o && setAlertaEstouro({...alertaEstouro, open: false})}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-black uppercase">
                    <AlertTriangle /> Atenção: Estouro de Valor Previsto
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-slate-700">
                    <p>O valor total desta Nota Fiscal excede o valor previsto na Ordem de Serviço.</p>
                    <div className="bg-red-50 p-3 rounded text-xs font-mono border border-red-100">
                        <p>Valor NF: <strong>{(alertaEstouro.nfVal / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></p>
                        <p>Valor OS: <strong>{(alertaEstouro.osVal / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></p>
                        <hr className="my-1 border-red-200"/>
                        <p className="text-red-700">Diferença: <strong>+ {(alertaEstouro.diff / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></p>
                    </div>
                    <p>Deseja prosseguir com o lançamento mesmo assim?</p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="font-bold uppercase text-xs">Revisar Valores</AlertDialogCancel>
                <AlertDialogAction onClick={gravarNoBanco} className="bg-red-600 hover:bg-red-700 font-black uppercase text-xs">Sim, Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}