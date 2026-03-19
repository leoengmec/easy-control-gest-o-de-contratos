import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];
const CIDADES_OS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const hoje = new Date().toISOString().split("T")[0];

  // Estados principais
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

  // Controle de dados e IA
  const [loadingBase, setLoadingBase] = useState(false);
  const [listaContratos, setListaContratos] = useState(contratos || []);
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      setLoadingBase(true);
      // Busca global para administradores
      base44.entities.Contrato.list()
        .then(res => setListaContratos(res || []))
        .finally(() => setLoadingBase(false));
    }
  }, [contratos]);

  useEffect(() => {
    if (contratoId) {
      base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
        .then(setEmpenhos)
        .catch(() => setEmpenhos([]));
    }
  }, [contratoId, ano]);

  const formatarMoeda = (v) => {
    if (v === undefined || v === null) return "0,00";
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
    if (!contratoId || selectedItems.length === 0) return toast.error("Selecione contrato e itens.");

    setSaving(true);
    try {
      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const itemObj = itens?.find(i => String(i.id) === String(itemId));

        // 1. Criar Lançamento (Pai)
        const resLanc = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          item_contrato_id: itemId,
          item_label: itemObj?.nome || "Item",
          mes: mesesNomes.indexOf(mes) + 1,
          ano: parseInt(ano),
          status,
          numero_nf: nf.numero_nf,
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

        // 2. Criar Ordens de Serviço (Filhas) vinculadas ao ID do Lançamento
        if (ordensServico.length > 0) {
          for (const os of ordensServico) {
            await base44.entities.OrdemServico.create({
              lancamento_id: resLanc.id,
              numero: os.numero_os,
              valor: os.valor || 0,
              descricao: os.descricao || "",
              data_emissao: os.data_emissao || "",
              locais: os.locais?.join(", ")
            });
          }
        }
      }

      toast.success("Gravado com sucesso no perfil Administrador!");
      if (onSave) onSave();
    } catch (err) {
      toast.error("Erro ao gravar. Verifique os campos obrigatórios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Painel de Gestão Financeira (ADM)</h2>
        <Badge className="bg-blue-600">Ambiente de Controle</Badge>
      </div>

      <div className="space-y-6">
        {/* Contrato */}
        <div className="space-y-2">
          <Label className="font-bold">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300">
              <SelectValue placeholder={loadingBase ? "Carregando base..." : "Selecione o contrato"} />
            </SelectTrigger>
            <SelectContent>
              {listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Mês/Ano/Status */}
        <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50 rounded-lg border border-gray-100">
           <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-gray-400">Mês</Label>
             <Select value={mes} onValueChange={setMes}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
             <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
           <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-gray-400">Ano</Label>
             <Select value={ano} onValueChange={setAno}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
             <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select></div>
           <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-gray-400">Status</Label>
             <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
             <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </div>

        {/* Seleção de Itens */}
        <div className="space-y-2">
          <Label className="font-bold">Itens para Pagamento/Medição *</Label>
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-white max-h-40 overflow-y-auto">
            {itens?.filter(i => String(i.contrato_id) === contratoId).map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox 
                  checked={selectedItems.includes(String(item.id))} 
                  onCheckedChange={(checked) => {
                    const id = String(item.id);
                    if (checked) {
                      setSelectedItems([...selectedItems, id]);
                      setNfsData({...nfsData, [id]: { numero_nf: "", valor: 0, retencao: 0, glosa: 0, valor_final: 0 }});
                    } else { setSelectedItems(selectedItems.filter(x => x !== id)); }
                  }} 
                />
                <label className="text-sm font-medium uppercase text-gray-600">{item.nome}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Notas Fiscais com Retenção/Glosa */}
        {selectedItems.map(itemId => {
          const item = itens?.find(i => String(i.id) === itemId);
          const data = nfsData[itemId] || {};
          return (
            <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-l-4 border-l-blue-600">
              <div className="text-xs font-black text-blue-600 uppercase mb-2">{item?.nome}</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold">Nº NF *</Label><Input value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold">Data NF</Label><Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold">Valor Bruto (R$)</Label><Input value={formatarMoeda(data.valor)} onChange={e => handleMoneyChange(itemId, "valor", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold text-red-500">Retenção</Label><Input value={formatarMoeda(data.retencao)} onChange={e => handleMoneyChange(itemId, "retencao", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-red-500">Glosa</Label><Input value={formatarMoeda(data.glosa)} onChange={e => handleMoneyChange(itemId, "glosa", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black text-green-600">Líquido Pago</Label><Input disabled className="bg-green-50 font-black text-green-700" value={formatarMoeda(data.valor_final)} /></div>
              </div>
            </div>
          );
        })}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="ghost" onClick={onCancel} disabled={saving} className="font-bold uppercase text-xs">Cancelar</Button>
          <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] hover:bg-black text-white px-10 h-12 font-black uppercase text-xs tracking-widest">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Finalizar Lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}