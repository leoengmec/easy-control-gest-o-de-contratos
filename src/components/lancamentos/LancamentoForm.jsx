import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

const AGLUTINADORES = [
  { id: "mor-natal", nome: "MOR Natal", subitens: ["SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA NATAL", "SERVIÇOS DE ARTÍFICE DE ELÉTRICA NATAL", "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL NATAL", "SERVIÇOS DE ARTÍFICE CIVIL NATAL", "ENGENHEIRO DE CAMPO NATAL"] },
  { id: "mor-mossoro", nome: "MOR Mossoró", subitens: ["SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ", "SERVIÇOS DE ARTÍFICE ELÉTRICA MOSSORÓ", "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ", "SERVIÇOS DE ARTÍFICE CIVIL MOSSORÓ"] }
];

const formatarMoeda = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0,00";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
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
  const [saving, setSaving] = useState(false);
  const [listaContratos, setListaContratos] = useState(contratos || []);

  useEffect(() => {
    base44.auth.me().then(setUser);
    if (!contratos || contratos.length === 0) {
      base44.entities.Contrato.list().then(res => setListaContratos(res || []));
    } else {
      setListaContratos(contratos);
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
    
    // O Base44 requer formato ISO para campos de Data/Hora de Auditoria
    const agoraISO = new Date().toISOString();
    const nomeResponsavel = user?.full_name || "Leonardo Alves";

    try {
      const subitensIgnorar = AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]);
      const opcoesEscolha = [
        ...AGLUTINADORES, 
        ...(itens?.filter(i => String(i.contrato_id) === contratoId && !subitensIgnorar.includes(i.nome?.toUpperCase())) || [])
      ];

      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const label = opcoesEscolha.find(o => String(o.id) === itemId)?.nome;
        const oss = ordensServico[itemId] || [];
        
        const createdLancamento = await base44.entities.LancamentoFinanceiro.create({
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
          data_lancamento: hoje, 
          
          // Registro de Auditoria: Na criação, ambos os blocos recebem o mesmo valor original
          responsavel_por_lancamento: nomeResponsavel,
          data_do_lancamento_original: agoraISO,
          responsavel_alteracao_status: nomeResponsavel,
          data_alteracao_status: agoraISO,
          
          ordens_servico: oss.map(o => ({ numero: o.numero_os, valor: o.valor, locais: o.locais?.join(", ") }))
        });

        // 2. Registra a ação de Criação no Histórico de Auditoria
        await base44.entities.HistoricoLancamento.create({
          lancamento_financeiro_id: String(createdLancamento.id),
          tipo_acao: "criacao",
          status_novo: status,
          motivo: "Lançamento inicial registrado pelo sistema.",
          realizado_por: nomeResponsavel,
          realizado_por_id: user?.id || "admin",
          data_acao: agoraISO
        });
      }

      toast.success("Lançamento finalizado e auditado com sucesso!");
      
      // Fluxo de Tela: Limpa estados para novo registro e mantém na página
      setSelectedItems([]);
      setNfsData({});
      setOrdensServico({});
      setProcessoPagSei("");
      setOrdemBancaria("");
      
      if (onSave) onSave();
    } catch (err) { 
      console.error("Erro no salvamento:", err);
      toast.error("Erro ao salvar os dados."); 
    }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-[#1a2e4a]">Gestão de Pagamentos</h2>
          <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Módulo de Lançamento Financeiro</span>
        </div>
        <Badge className="bg-[#1a2e4a] text-white uppercase text-[10px]">Administrador</Badge>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold">Contrato Vinculado *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
            <SelectContent>{listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-dashed">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-gray-500">Mês de Referência</Label>
            <Select value={mes} onValueChange={setMes}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-gray-500">Exercício</Label>
            <Select value={ano} onValueChange={setAno}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-gray-500">Status Inicial</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Selecione os Itens para Lançamento *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-11 border-gray-300">
                {selectedItems.length === 0 ? "Clique para selecionar itens..." : `${selectedItems.length} item(ns) selecionado(s)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-2 bg-white shadow-2xl border-gray-200">
              <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                {[...AGLUTINADORES, ...(itens?.filter(i => String(i.contrato_id) === contratoId && !AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]).includes(i.nome?.toUpperCase())) || [])].map(opcao => (
                  <div key={opcao.id} className="flex items-center space-x-3 p-2 hover:bg-blue-50 rounded-md transition-colors border-b last:border-0 border-gray-100">
                    <Checkbox id={`it-${opcao.id}`} checked={selectedItems.includes(String(opcao.id))} onCheckedChange={() => toggleItem(opcao.id)} />
                    <label htmlFor={`it-${opcao.id}`} className="text-[11px] font-semibold uppercase cursor-pointer text-gray-600 leading-tight">{opcao.nome}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {selectedItems.map(itemId => {
            const item = [...AGLUTINADORES, ...(itens?.filter(i => String(i.contrato_id) === contratoId && !AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]).includes(i.nome?.toUpperCase())) || [])].find(o => String(o.id) === itemId);
            const data = nfsData[itemId] || {};
            return (
              <div key={itemId} className="p-5 border rounded-xl bg-white shadow-sm space-y-4 border-l-4 border-l-[#1a2e4a]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-[#1a2e4a] uppercase bg-blue-50 px-2 py-1 rounded">{item?.nome}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => toggleItem(itemId)}>×</Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Número da NF</Label>
                    <Input placeholder="000.000" className="h-9" value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Data de Emissão</Label>
                    <Input type="date" className="h-9" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Valor Bruto (R$)</Label>
                    <Input className="h-9 font-mono" placeholder="0,00" value={formatarMoeda(data.valor)} onChange={e => { const val = Number(e.target.value.replace(/\D/g, "")) / 100; setNfsData({...nfsData, [itemId]: {...data, valor: val, valor_final: val - (data.retencao || 0) - (data.glosa || 0)}})}} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
          <Button variant="ghost" onClick={onCancel} className="font-semibold uppercase text-xs">Cancelar</Button>
          <Button 
            onClick={executeSave} 
            disabled={saving || selectedItems.length === 0 || !contratoId} 
            className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white px-12 h-12 font-black uppercase text-xs tracking-widest shadow-lg transition-all"
          >
            {saving ? <Loader2 className="animate-spin h-5 w-5" /> : "Finalizar Lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}