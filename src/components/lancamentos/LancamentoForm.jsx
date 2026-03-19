import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];
const CIDADES_OS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

const ITEMS_EXIGEM_OS = [
  "FORNECIMENTO DE MATERIAL",
  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
  "SERVIÇOS EVENTUAIS",
  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
  "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO"
];

const formatarMoeda = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0,00";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const hoje = new Date().toISOString().split("T")[0];

  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState("2026");
  const [status, setStatus] = useState("Em instrução");
  const [selectedItems, setSelectedItems] = useState([]);
  const [nfsData, setNfsData] = useState({});
  const [ordensServico, setOrdensServico] = useState([{
    id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, data_execucao: "", locais: []
  }]);
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [ordemBancaria, setOrdemBancaria] = useState("");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");

  const [listaContratos, setListaContratos] = useState(contratos || []);
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      base44.entities.Contrato.list().then(res => setListaContratos(res || []));
    }
  }, [contratos]);

  useEffect(() => {
    if (contratoId) {
      base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
        .then(setEmpenhos).catch(() => setEmpenhos([]));
    }
  }, [contratoId, ano]);

  // Função que estava faltando e causava o erro ReferenceError
  const toggleItem = (itemId) => {
    const idStr = String(itemId);
    setSelectedItems(prev => {
      if (prev.includes(idStr)) {
        return prev.filter(id => id !== idStr);
      } else {
        setNfsData(current => ({
          ...current,
          [idStr]: current[idStr] || { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0, valor_final: 0 }
        }));
        return [...prev, idStr];
      }
    });
  };

  const handleNFMoneyChange = (itemId, field, raw) => {
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
    if (!contratoId || selectedItems.length === 0) return toast.error("Preencha Contrato e Itens.");

    setSaving(true);
    try {
      const payloadOS = selectedItems.some(id => ITEMS_EXIGEM_OS.includes(itens?.find(i => String(i.id) === id)?.nome?.toUpperCase()))
        ? ordensServico.map(os => ({
            numero: os.numero_os || "",
            data_emissao: os.data_emissao || "",
            descricao: os.descricao || "",
            valor: os.valor || 0,
            data_execucao: os.data_execucao || "",
            locais_prestacao_servicos: os.locais || []
          })) : [];

      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const itemObj = itens?.find(i => String(i.id) === String(itemId));

        await base44.entities.LancamentoFinanceiro.create({
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
          observacoes: observacoes,
          ordens_servico: payloadOS
        });
      }

      toast.success("Lançamento salvo com sucesso!");
      
      // Limpeza completa para voltar à tela inicial [cite: 115]
      setContratoId("");
      setSelectedItems([]);
      setNfsData({});
      setOrdensServico([{ id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, data_execucao: "", locais: [] }]);
      setProcessoPagSei("");
      setOrdemBancaria("");
      setObservacoes("");
      
      if (onSave) onSave();
    } catch (err) {
      toast.error("Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Painel de Gestão Financeira (ADM)</h2>
        <Badge className="bg-[#1a2e4a] text-white">Ambiente de Controle</Badge>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
            <SelectContent>{listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50 rounded-lg border border-gray-100">
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Mês *</Label>
            <Select value={mes} onValueChange={setMes}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Ano *</Label>
            <Select value={ano} onValueChange={setAno}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Status *</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Itens do Contrato *</Label>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 border-gray-300 text-gray-700">{selectedItems.length === 0 ? "Selecione os itens..." : `${selectedItems.length} selecionado(s)`}</Button></PopoverTrigger>
            <PopoverContent className="w-[400px] p-2 bg-white shadow-xl">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {itens?.filter(i => String(i.contrato_id) === contratoId).map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded">
                    <Checkbox id={`it-${item.id}`} checked={selectedItems.includes(String(item.id))} onCheckedChange={() => toggleItem(item.id)} />
                    <label htmlFor={`it-${item.id}`} className="text-sm font-medium uppercase cursor-pointer">{item.nome}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {selectedItems.map(itemId => {
          const item = itens?.find(i => String(i.id) === itemId);
          const data = nfsData[itemId] || {};
          const empenho = empenhos.find(e => String(e.item_contrato_id) === itemId);
          return (
            <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-l-4 border-l-[#1a2e4a]">
              <div className="flex justify-between items-center"><span className="text-xs font-black text-[#1a2e4a] uppercase">{item?.nome}</span>{empenho && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">{empenho.numero_empenho}</Badge>}</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-gray-400">Nº NF *</Label><Input value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-gray-400">Data NF</Label><Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-gray-400">Valor Bruto (R$)</Label><Input value={formatarMoeda(data.valor)} onChange={e => handleNFMoneyChange(itemId, "valor", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-red-400">Retenção</Label><Input value={formatarMoeda(data.retencao)} onChange={e => handleNFMoneyChange(itemId, "retencao", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-red-400">Glosa</Label><Input value={formatarMoeda(data.glosa)} onChange={e => handleNFMoneyChange(itemId, "glosa", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-green-500">Líquido Pago</Label><Input disabled className="bg-green-50 font-black text-green-700" value={formatarMoeda(data.valor_final)} /></div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Processo SEI</Label><Input value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="000.000/2026" /></div>
          <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Ordem Bancária</Label><Input value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="2026OB..." /></div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
          <Button variant="ghost" onClick={onCancel} disabled={saving} className="font-bold uppercase text-xs">Cancelar</Button>
          <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] text-white px-10 h-12 font-black uppercase text-xs tracking-widest hover:bg-[#2a4a7a]">
            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Finalizar Lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}