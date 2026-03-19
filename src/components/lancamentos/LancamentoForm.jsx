import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];
const CIDADES_OS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const hoje = new Date().toISOString().split("T")[0];

  // Estados do Formulário
  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState("2026");
  const [status, setStatus] = useState("Em instrução");
  const [selectedItems, setSelectedItems] = useState([]);
  const [nfsData, setNfsData] = useState({});
  const [ordensServico, setOrdensServico] = useState([]);
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [ordemBancaria, setOrdemBancaria] = useState("");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");

  // Estados de Controle
  const [loadingBase, setLoadingBase] = useState(false);
  const [listaContratos, setListaContratos] = useState(contratos || []);
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  
  const pdfInputRef = useRef(null);

  // 1. Carregamento de Dados Iniciais
  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      setLoadingBase(true);
      base44.entities.Contrato.list()
        .then(res => setListaContratos(res || []))
        .finally(() => setLoadingBase(false));
    }
  }, [contratos]);

  // 2. Busca de Empenhos quando troca contrato ou ano
  useEffect(() => {
    if (contratoId) {
      base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
        .then(setEmpenhos)
        .catch(() => setEmpenhos([]));
    }
  }, [contratoId, ano]);

  const formatarMoeda = (v) => {
    if (!v) return "0,00";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleMoneyChange = (itemId, field, raw) => {
    const val = Number(raw.replace(/\D/g, "")) / 100;
    setNfsData(prev => {
      const current = prev[itemId] || {};
      const updated = { ...current, [field]: val };
      updated.valor_final = (updated.valor || 0) - (updated.retencao || 0) - (updated.glosa || 0);
      return { ...prev, [itemId]: updated };
    });
  };

  const executeSave = async () => {
    if (saving) return;
    if (!contratoId || selectedItems.length === 0) return toast.error("Dados incompletos.");

    setSaving(true);
    try {
      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const itemObj = itens?.find(i => String(i.id) === String(itemId));

        // PASSO 1: Criar o Lançamento Financeiro Principal
        const novoLancamento = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          item_contrato_id: itemId,
          item_label: itemObj?.nome || "Item",
          mes: mesesNomes.indexOf(mes) + 1,
          ano: parseInt(ano),
          status,
          numero_nf: nf.numero_nf || "",
          data_nf: nf.data_nf || hoje,
          valor: nf.valor || 0,
          retencao: nf.retencao || 0,
          glosa: nf.glosa || 0,
          valor_pago_final: nf.valor_final || 0,
          processo_pagamento_sei: processoPagSei,
          ordem_bancaria: ordemBancaria,
          data_lancamento: dataLancamento,
          observacoes: observacoes
        });

        // PASSO 2: Se houver OS, criar vinculada ao ID do lançamento acima
        if (ordensServico.length > 0) {
          for (const os of ordensServico) {
            await base44.entities.OrdemServico.create({
              lancamento_id: novoLancamento.id,
              numero: os.numero_os,
              valor: os.valor,
              descricao: os.descricao,
              data_emissao: os.data_emissao,
              locais: os.locais?.join(", ")
            });
          }
        }
      }

      toast.success("Lançamento e dependências salvos!");
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar. Verifique a conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-8 shadow-md border-gray-100 font-sans">
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Novo Lançamento Financeiro</h2>

        {/* Seleção de Contrato */}
        <div className="space-y-2">
          <Label className="font-bold">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300">
              <SelectValue placeholder={loadingBase ? "Carregando..." : "Selecione o contrato"} />
            </SelectTrigger>
            <SelectContent>
              {listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Mês, Ano e Status */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
           <div className="space-y-1"><Label className="text-xs font-bold uppercase">Mês</Label>
             <Select value={mes} onValueChange={setMes}><SelectTrigger><SelectValue /></SelectTrigger>
             <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
           </div>
           <div className="space-y-1"><Label className="text-xs font-bold uppercase">Ano</Label>
             <Select value={ano} onValueChange={setAno}><SelectTrigger><SelectValue /></SelectTrigger>
             <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select>
           </div>
           <div className="space-y-1"><Label className="text-xs font-bold uppercase">Status</Label>
             <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
             <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
           </div>
        </div>

        {/* Seleção de Itens (Multi-seleção) */}
        <div className="space-y-2">
          <Label className="font-bold">Itens do Contrato (Selecione um ou mais) *</Label>
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-white">
            {itens?.filter(i => String(i.contrato_id) === contratoId).map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox 
                  checked={selectedItems.includes(String(item.id))} 
                  onCheckedChange={(checked) => {
                    const id = String(item.id);
                    if (checked) {
                      setSelectedItems([...selectedItems, id]);
                      setNfsData({...nfsData, [id]: { numero_nf: "", valor: 0, valor_final: 0 }});
                    } else {
                      setSelectedItems(selectedItems.filter(x => x !== id));
                    }
                  }} 
                />
                <label className="text-sm font-medium uppercase">{item.nome}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco de Notas Fiscais e IA */}
        {selectedItems.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#1a2e4a] uppercase text-sm">Dados das Notas Fiscais</h3>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => pdfInputRef.current.click()}>
                <Upload className="w-4 h-4 mr-2" /> Importar PDF
              </Button>
              <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" />
            </div>

            {selectedItems.map(itemId => {
              const item = itens?.find(i => String(i.id) === itemId);
              const data = nfsData[itemId] || {};
              return (
                <div key={itemId} className="p-4 border rounded-lg bg-white space-y-4 shadow-sm">
                  <div className="text-xs font-black text-gray-400 uppercase">{item?.nome}</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1"><Label className="text-[10px] font-bold">Nº NF</Label><Input value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-bold">Data NF</Label><Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-bold">Valor NF</Label><Input value={formatarMoeda(data.valor)} onChange={e => handleMoneyChange(itemId, "valor", e.target.value)} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé e Botões */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] min-w-[150px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Tudo"}
          </Button>
        </div>
      </div>
    </Card>
  );
}