import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];
const CIDADES_OS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

const AGLUTINADORES = [
  { id: "mor-natal", nome: "MOR Natal", subitens: ["SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA NATAL", "SERVIÇOS DE ARTÍFICE DE ELÉTRICA NATAL", "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL NATAL", "SERVIÇOS DE ARTÍFICE CIVIL NATAL", "ENGENHEIRO DE CAMPO NATAL"] },
  { id: "mor-mossoro", nome: "MOR Mossoró", subitens: ["SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ", "SERVIÇOS DE ARTÍFICE ELÉTRICA MOSSORÓ", "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ", "SERVIÇOS DE ARTÍFICE CIVIL MOSSORÓ"] }
];

const formatarMoeda = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0,00";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel, onDelete }) {
  const hoje = new Date().toISOString().split("T")[0];

  const [user, setUser] = useState(null);
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
  const pdfInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
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

  const executeSave = async () => {
    if (saving) return;
    setSaving(true);
    const agora = new Date().toLocaleString("pt-BR");

    try {
      const subitensIgnorar = AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]);
      const opcoesEscolha = [...AGLUTINADORES, ...(itens?.filter(i => String(i.contrato_id) === contratoId && !subitensIgnorar.includes(i.nome?.toUpperCase())) || [])];

      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const label = opcoesEscolha.find(o => String(o.id) === itemId)?.nome;
        const oss = ordensServico[itemId] || [];
        
        await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId, 
          item_label: label, 
          mes: mesesNomes.indexOf(mes) + 1, 
          ano: parseInt(ano), 
          status,
          numero_nf: nf.numero_nf || "", 
          data_nf: nf.data_nf || hoje, 
          valor: nf.valor || 0, 
          retencao: nf.retencao || 0, 
          glosa: nf.glosa || 0, 
          valor_pago_final: nf.valor_final || 0,
          processo_pagamento_sei: processoPagSei || "", 
          ordem_bancaria: ordemBancaria || "", 
          data_lancamento: dataLancamento, 
          observacoes: observacoes || "",
          // CORREÇÃO DOS LOGS: Garante que apareça no Extrato desde o primeiro save
          responsavel_por_lancamento: user?.full_name || "Leonardo Alves",
          data_do_lancamento_original: agora,
          responsavel_alteracao_status: user?.full_name || "Leonardo Alves",
          data_alteracao_status: agora,
          ordens_servico: oss.map(o => ({ numero: o.numero_os, valor: o.valor, locais: o.locais?.join(", ") }))
        });
      }
      toast.success("Lançamento finalizado com logs de auditoria.");
      // Limpeza para novo registro
      setContratoId(""); setSelectedItems([]); setNfsData({}); setOrdensServico({}); setProcessoPagSei(""); setOrdemBancaria("");
      if (onSave) onSave();
    } catch (err) { 
      toast.error("Erro ao salvar."); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Novo Lançamento</h2>
        <div className="flex gap-2">
          {lancamento?.id && (
            <Button variant="destructive" size="sm" onClick={() => window.confirm("Excluir?") && onDelete(lancamento.id)} className="bg-red-50 text-red-600 border-red-200">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          )}
          <Badge className="bg-[#1a2e4a] text-white uppercase text-[10px]">Ambiente de Controle</Badge>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold text-gray-700">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
            <SelectContent>{listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/30 grid grid-cols-3 gap-4">
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-gray-400">Mês *</Label>
            <Select value={mes} onValueChange={setMes}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-gray-400">Ano *</Label>
            <Select value={ano} onValueChange={setAno}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-gray-400">Status *</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold text-gray-700">Itens do Contrato *</Label>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 border-gray-300 text-gray-700">{selectedItems.length === 0 ? "Selecione os itens..." : `${selectedItems.length} selecionado(s)`}</Button></PopoverTrigger>
            <PopoverContent className="w-[400px] p-2 bg-white shadow-xl"><div className="space-y-2 max-h-60 overflow-y-auto">
              {[...AGLUTINADORES, ...(itens?.filter(i => String(i.contrato_id) === contratoId && !AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]).includes(i.nome?.toUpperCase())) || [])].map(opcao => (
                <div key={opcao.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded">
                  <Checkbox id={`it-${opcao.id}`} checked={selectedItems.includes(String(opcao.id))} onCheckedChange={() => toggleItem(opcao.id)} />
                  <label htmlFor={`it-${opcao.id}`} className="text-sm font-medium uppercase cursor-pointer">{opcao.nome}</label>
                </div>
              ))}
            </div></PopoverContent>
          </Popover>
        </div>

        {selectedItems.map(itemId => {
          const subitensIgnorar = AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]);
          const item = [...AGLUTINADORES, ...(itens?.filter(i => String(i.contrato_id) === contratoId && !subitensIgnorar.includes(i.nome?.toUpperCase())) || [])].find(o => String(o.id) === itemId);
          const data = nfsData[itemId] || {};
          return (
            <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-l-4 border-l-[#1a2e4a]">
              <span className="text-xs font-black text-[#1a2e4a] uppercase">{item?.nome}</span>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold text-gray-400 uppercase">Nº NF *</Label><Input value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-gray-400 uppercase">Data NF</Label><Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-gray-400 uppercase">Valor Bruto</Label><Input value={formatarMoeda(data.valor)} onChange={e => { const val = Number(e.target.value.replace(/\D/g, "")) / 100; setNfsData({...nfsData, [itemId]: {...data, valor: val, valor_final: val - data.retencao - data.glosa}})}} /></div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
          <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Processo SEI</Label><Input value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="000.000/2026" /></div>
          <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Ordem Bancária</Label><Input value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="2026OB..." /></div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
          <Button variant="ghost" onClick={onCancel} disabled={saving} className="font-bold uppercase text-xs">Cancelar</Button>
          <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] text-white px-10 h-12 font-black uppercase text-xs tracking-widest hover:bg-black">
            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Finalizar Lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}