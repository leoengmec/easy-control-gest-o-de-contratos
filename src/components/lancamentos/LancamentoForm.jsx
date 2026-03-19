import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

const AGLUTINADORES = [
  { 
    id: "mor-natal", 
    nome: "MOR Natal", 
    subitens: ["SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA NATAL", "SERVIÇOS DE ARTÍFICE DE ELÉTRICA NATAL", "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL NATAL", "SERVIÇOS DE ARTÍFICE CIVIL NATAL", "ENGENHEIRO DE CAMPO NATAL"]
  },
  {
    id: "mor-mossoro",
    nome: "MOR Mossoró",
    subitens: ["SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ", "SERVIÇOS DE ARTÍFICE ELÉTRICA MOSSORÓ", "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ", "SERVIÇOS DE ARTÍFICE CIVIL MOSSORÓ"]
  }
];

const formatarMoeda = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0,00";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel, onDelete }) {
  const hoje = new Date().toISOString().split("T")[0];

  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState("2026");
  const [status, setStatus] = useState("Em instrução");
  const [selectedItems, setSelectedItems] = useState([]); 
  const [nfsData, setNfsData] = useState({});
  const [ordensServico, setOrdensServico] = useState({});
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [ordemBancaria, setOrdemBancaria] = useState("");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");

  const [listaContratos, setListaContratos] = useState(contratos || []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const subitensIgnorar = AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]);
  const itensFiltrados = itens?.filter(i => String(i.contrato_id) === contratoId && !subitensIgnorar.includes(i.nome?.toUpperCase())) || [];
  const opcoesEscolha = [...AGLUTINADORES, ...itensFiltrados];

  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      base44.entities.Contrato.list().then(res => setListaContratos(res || []));
    }
  }, [contratos]);

  const toggleItem = (itemId) => {
    const idStr = String(itemId);
    setSelectedItems(prev => {
      if (prev.includes(idStr)) return prev.filter(id => id !== idStr);
      setNfsData(c => ({ ...c, [idStr]: { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0, valor_final: 0 }}));
      if (!idStr.includes("mor-")) setOrdensServico(o => ({ ...o, [idStr]: [{ id: Date.now(), numero_os: "", locais: [] }]}));
      return [...prev, idStr];
    });
  };

  const handleDeletar = async () => {
    if (!lancamento?.id) return;
    
    const confirmar = window.confirm("Tem certeza que deseja excluir este lançamento permanentemente?");
    if (!confirmar) return;

    setDeleting(true);
    try {
      await base44.entities.LancamentoFinanceiro.delete(lancamento.id);
      toast.success("Lançamento excluído com sucesso.");
      
      // Limpa a tela após deletar
      setContratoId(""); 
      setSelectedItems([]); 
      setNfsData({});
      
      if (onDelete) onDelete();
      if (onCancel) onCancel();
    } catch (err) {
      toast.error("Erro ao excluir o lançamento.");
    } finally {
      setDeleting(false);
    }
  };

  const executeSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const label = opcoesEscolha.find(o => String(o.id) === itemId)?.nome;
        const oss = ordensServico[itemId] || [];
        await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId, item_label: label, mes: mesesNomes.indexOf(mes) + 1, ano: parseInt(ano), status,
          numero_nf: nf.numero_nf, data_nf: nf.data_nf, valor: nf.valor, retencao: nf.retencao, glosa: nf.glosa, valor_pago_final: nf.valor_final,
          processo_pagamento_sei: processoPagSei, ordem_bancaria: ordemBancaria, data_lancamento: dataLancamento, observacoes,
          ordens_servico: oss.map(o => ({ numero: o.numero_os, valor: o.valor, locais: o.locais?.join(", ") }))
        });
      }
      toast.success("Lançamento salvo!");
      setContratoId(""); setSelectedItems([]); setNfsData({}); setOrdensServico({}); setProcessoPagSei(""); setOrdemBancaria("");
    } catch (err) { toast.error("Erro ao salvar."); }
    finally { setSaving(false); if (onSave) onSave(); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Novo Lançamento</h2>
        <div className="flex gap-2">
          {lancamento?.id && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeletar} 
              disabled={deleting}
              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-200"
            >
              {deleting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
          )}
          <Badge className="bg-[#1a2e4a] text-white uppercase text-[10px]">ADM</Badge>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
            <SelectContent>{listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/30 grid grid-cols-3 gap-4">
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
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-white max-h-48 overflow-y-auto text-gray-700">
            {opcoesEscolha.map(opcao => (
              <div key={opcao.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded">
                <Checkbox checked={selectedItems.includes(String(opcao.id))} onCheckedChange={() => toggleItem(opcao.id)} />
                <label className="text-sm font-medium uppercase">{opcao.nome}</label>
              </div>
            ))}
          </div>
        </div>

        {selectedItems.map(itemId => {
          const item = opcoesEscolha.find(o => String(o.id) === itemId);
          const data = nfsData[itemId] || {};
          const oss = ordensServico[itemId] || [];
          return (
            <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-l-4 border-l-[#1a2e4a]">
              <div className="flex justify-between items-center"><span className="text-xs font-black text-[#1a2e4a] uppercase">{item?.nome}</span></div>
              <div className="grid grid-cols-3 gap-4">
                <Input placeholder="Nº NF *" value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} />
                <Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} />
                <Input placeholder="Valor Bruto *" value={formatarMoeda(data.valor)} onChange={e => { const val = Number(e.target.value.replace(/\D/g, "")) / 100; setNfsData({...nfsData, [itemId]: {...data, valor: val, valor_final: val - data.retencao - data.glosa}})}} />
              </div>
              {!itemId.includes("mor-") && (
                <div className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="text-[10px] font-bold uppercase text-gray-400">Ordens de Serviço</h4>
                  {oss.map((os, idx) => (
                    <div key={os.id} className="grid grid-cols-2 gap-4">
                      <Input placeholder="Nº OS *" value={os.numero_os} onChange={e => { const up = [...oss]; up[idx].numero_os = e.target.value; setOrdensServico({...ordensServico, [itemId]: up}); }} />
                      <Input placeholder="Valor OS *" value={formatarMoeda(os.valor)} onChange={e => { const v = Number(e.target.value.replace(/\D/g, "")) / 100; const up = [...oss]; up[idx].valor = v; setOrdensServico({...ordensServico, [itemId]: up}); }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <Input placeholder="Processo SEI" value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} />
          <Input placeholder="Ordem Bancária" value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] text-white px-10 h-12 font-black uppercase text-xs">
            {saving ? "Salvando..." : "Salvar lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}