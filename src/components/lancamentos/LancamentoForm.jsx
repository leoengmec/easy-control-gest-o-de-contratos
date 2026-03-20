import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

// Definição dos Aglutinadores de Mão de Obra Residente
const AGLUTINADORES = [
  { id: "mor-natal", nome: "MOR Natal", keywords: ["NATAL", "ENGENHEIRO"], natureza: "servico" },
  { id: "mor-mossoro", nome: "MOR Mossoró", keywords: ["MOSSORÓ", "MOSSORO"], natureza: "servico" }
];

const formatarMoeda = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0,00";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function LancamentoForm({ contratos, itens, onSave, onCancel, user }) {
  const hoje = new Date().toISOString().split("T")[0];
  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [status, setStatus] = useState("Em instrução");
  const [selectedItems, setSelectedItems] = useState([]); 
  const [nfsData, setNfsData] = useState({});
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [saving, setSaving] = useState(false);

  // Filtra itens do contrato e remove os que pertencem aos aglutinadores para não duplicar na lista
  const itensFiltrados = (itens || []).filter(i => {
    const nome = (i.nome || "").toUpperCase();
    const pertenceAglutinador = AGLUTINADORES.some(a => a.keywords.some(k => nome.includes(k)));
    return i.contrato_id === contratoId && !pertenceAglutinador;
  });

  const opcoesEscolha = [...AGLUTINADORES, ...itensFiltrados];

  const toggleItem = (itemId) => {
    const idStr = String(itemId);
    setSelectedItems(prev => {
      if (prev.includes(idStr)) return prev.filter(id => id !== idStr);
      setNfsData(c => ({ 
        ...c, 
        [idStr]: { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0 }
      }));
      return [...prev, idStr];
    });
  };

  const executeSave = async () => {
    if (saving) return;
    setSaving(true);
    const agoraISO = new Date().toISOString();
    const nomeResponsavel = user?.full_name || user?.email || "Sistema";

    try {
      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const opcao = opcoesEscolha.find(o => String(o.id) === itemId);
        
        // REGRA: Se for aglutinador, o item_contrato_id fica nulo, mas o item_label identifica o grupo
        // Se for item comum, salvamos o ID para o cálculo de saldo individual.
        const isAglutinador = String(itemId).startsWith("mor-");

        const createdLancamento = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId, 
          item_contrato_id: isAglutinador ? null : itemId,
          item_label: opcao?.nome, 
          mes: mesesNomes.indexOf(mes) + 1, 
          ano: parseInt(ano), 
          status,
          numero_nf: nf.numero_nf || "", 
          data_nf: nf.data_nf || hoje, 
          valor: nf.valor || 0, 
          retencao: nf.retencao || 0, 
          glosa: nf.glosa || 0, 
          valor_pago_final: (nf.valor || 0) - (nf.retencao || 0) - (nf.glosa || 0),
          processo_pagamento_sei: processoPagSei || "", 
          data_lancamento: hoje,
          responsavel_por_lancamento: nomeResponsavel
        });

        // 2. Registro na LogAuditoria (Correção da Divergência Arquitetural)
        await base44.entities.LogAuditoria.create({
          entidade_id: createdLancamento.id,
          tipo_acao: "CRIACAO_LANCAMENTO",
          valor_operacao: nf.valor || 0,
          justificativa: `Lançamento inicial: ${opcao?.nome} - Ref: ${mes}/${ano}`,
          responsavel: nomeResponsavel,
          data_acao: agoraISO
        });
      }

      toast.success(`${selectedItems.length} lançamentos registrados com sucesso!`);
      setSelectedItems([]);
      setNfsData({});
      if (onSave) onSave();
    } catch (err) { 
      console.error(err);
      toast.error("Falha ao salvar lançamentos"); 
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-6 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-black text-[#1a2e4a] uppercase tracking-tighter flex items-center gap-2">
            <Wallet className="w-6 h-6" /> Novo Lançamento Financeiro
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Competência e vinculação contratual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Contrato Principal</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-11 border-gray-300">
              <SelectValue placeholder="Selecione o contrato para carregar os itens" />
            </SelectTrigger>
            <SelectContent>
              {contratos?.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.numero_contrato || c.numero} | {c.empresa || c.contratada}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-blue-600">Mês Referência</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-blue-600">Ano</Label>
            <Input value={ano} onChange={e => setAno(e.target.value)} className="h-11 font-mono text-center" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Itens Orçamentários e Aglutinadores MOR</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-12 border-gray-300 font-bold text-[#1a2e4a]">
                {selectedItems.length === 0 ? "SELECIONE OS ITENS PARA ESTE PAGAMENTO" : `${selectedItems.length} ITEM(NS) SELECIONADO(S)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-2 bg-white" align="start">
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {opcoesEscolha.map(opcao => (
                  <div key={opcao.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md border-b last:border-0 border-gray-100 transition-colors">
                    <Checkbox id={`it-${opcao.id}`} checked={selectedItems.includes(String(opcao.id))} onCheckedChange={() => toggleItem(opcao.id)} />
                    <label htmlFor={`it-${opcao.id}`} className="text-[11px] font-bold uppercase cursor-pointer text-gray-700 leading-tight flex-1">
                      {opcao.nome} {String(opcao.id).startsWith('mor-') && <Badge className="ml-2 bg-amber-100 text-amber-700 border-none h-4 text-[8px]">AGLUTINADOR</Badge>}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[350px] pr-2">
          {selectedItems.map(itemId => {
            const opcao = opcoesEscolha.find(o => String(o.id) === itemId);
            const data = nfsData[itemId] || {};
            return (
              <div key={itemId} className="p-4 border rounded-lg bg-gray-50/50 space-y-4 border-l-4 border-l-[#1a2e4a] relative">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-[#1a2e4a] uppercase bg-white px-2 py-1 rounded shadow-sm border">{opcao?.nome}</span>
                  <Button variant="ghost" size="sm" className="text-red-500 font-bold text-xs hover:bg-red-50" onClick={() => toggleItem(itemId)}>REMOVER</Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Nº da Nota Fiscal</Label>
                    <Input className="h-9 bg-white" value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Data Emissão</Label>
                    <Input type="date" className="h-9 bg-white" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Valor Bruto (R$)</Label>
                    <Input className="h-9 font-mono bg-white" value={formatarMoeda(data.valor)} onChange={e => {
                      const val = Number(e.target.value.replace(/\D/g, "")) / 100;
                      setNfsData({...nfsData, [itemId]: {...data, valor: val}});
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-6">
        <Button variant="ghost" onClick={onCancel} className="font-bold uppercase text-[10px]">Cancelar</Button>
        <Button 
          onClick={executeSave} 
          disabled={saving || selectedItems.length === 0 || !contratoId} 
          className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white px-10 h-11 font-black uppercase text-[10px] shadow-lg"
        >
          {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Gravar Lançamentos"}
        </Button>
      </div>
    </div>
  );
}