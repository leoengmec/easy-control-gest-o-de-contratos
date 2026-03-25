import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Info } from "lucide-react"; // Importação ajustada
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query"; // ✅ Para atualizar o Dashboard

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

export default function LancamentoForm({ contratos, itens, onSave, onCancel, user }) {
  const queryClient = useQueryClient(); // ✅ Hook para invalidação de cache
  const hoje = new Date().toISOString().split("T")[0];
  
  // Estados do Formulário
  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [status, setStatus] = useState("Em instrução");
  const [selectedItems, setSelectedItems] = useState([]); 
  const [nfsData, setNfsData] = useState({});
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [saving, setSaving] = useState(false);
  const [aglutinadoresDinamicos, setAglutinadoresDinamicos] = useState([]);

  // ✅ Carregamento de Configurações
  useEffect(() => {
    const fetchAglutinadores = async () => {
      try {
        const configs = await base44.entities.ConfiguracaoApp.filter({ chave: 'AGLUTINADOR_MOR' });
        if (configs.length > 0) {
          const parsed = configs.map(c => JSON.parse(c.valor)).filter(Boolean);
          setAglutinadoresDinamicos(parsed);
        } else {
          setAglutinadoresDinamicos([
            { id: "mor-natal", nome: "MOR Natal", keywords: ["NATAL", "ENGENHEIRO"], natureza: "servico" },
            { id: "mor-mossoro", nome: "MOR Mossoró", keywords: ["MOSSORÓ", "MOSSORO"], natureza: "servico" }
          ]);
        }
      } catch (e) { console.error("Erro ao buscar aglutinadores", e); }
    };
    fetchAglutinadores();
  }, []);

  const itensFiltrados = (itens || []).filter(i => {
    const nome = (i.nome || "").toUpperCase();
    const pertenceAglutinador = aglutinadoresDinamicos.some(a => a.keywords.some(k => nome.includes(k)));
    return i.contrato_id === contratoId && !pertenceAglutinador;
  });

  const opcoesEscolha = [...aglutinadoresDinamicos, ...itensFiltrados];

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

  // ✅ Lógica de Gravação Otimizada
  const executeSave = async () => {
    if (saving) return;
    setSaving(true);
    const nomeResponsavel = user?.nome || user?.email || "Sistema";

    try {
      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const opcao = opcoesEscolha.find(o => String(o.id) === itemId);
        const isAglutinador = String(itemId).startsWith("mor-");
        const valorLancamento = nf.valor || 0;

        // Validação de Saldo (Simplificada para a lógica do form)
        const contratoAtual = contratos.find(c => String(c.id) === String(contratoId));
        const valorDisponivel = isAglutinador ? (contratoAtual?.valor_global || 0) : (opcao?.valor_total_contratado || 0);

        // Chamada de criação
        const created = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId, 
          item_contrato_id: isAglutinador ? null : itemId,
          item_label: opcao?.nome, 
          mes: mesesNomes.indexOf(mes) + 1, 
          ano: parseInt(ano), 
          status,
          numero_nf: nf.numero_nf || "", 
          data_nf: nf.data_nf || hoje, 
          valor: valorLancamento, 
          valor_pago_final: (valorLancamento) - (nf.retencao || 0) - (nf.glosa || 0),
          processo_pagamento_sei: processoPagSei || "", 
          data_lancamento: hoje,
          responsavel_por_lancamento: nomeResponsavel
        });

        // Log de Auditoria
        await base44.entities.LogAuditoria.create({
          entidade_id: created.id,
          tipo_acao: "CRIACAO_LANCAMENTO",
          valor_operacao: valorLancamento,
          responsavel: nomeResponsavel,
          data_acao: new Date().toISOString()
        });
      }

      toast.success("Lançamentos registrados!");
      
      // ✅ Atualiza os dados no Dashboard e Relatórios sem recarregar a página
      queryClient.invalidateQueries(); 
      
      if (onSave) onSave();
    } catch (err) { 
      toast.error("Erro ao salvar dados.");
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
        {/* ✅ Novo Campo de Status Global do Lote */}
        <div className="w-48">
          <Label className="text-[9px] font-bold uppercase text-gray-400">Status do Lote</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs font-bold border-blue-200 bg-blue-50/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs font-bold uppercase">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Contrato Principal</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-11 border-gray-300">
              <SelectValue placeholder="Selecione o contrato" />
            </SelectTrigger>
            <SelectContent>
              {contratos?.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.numero} | {c.contratada?.substring(0, 30)}
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
        {/* Popover de Seleção de Itens */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Itens Orçamentários</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-12 border-gray-300 font-bold text-[#1a2e4a]">
                {selectedItems.length === 0 ? "CLIQUE PARA SELECIONAR OS ITENS" : `${selectedItems.length} ITEM(NS) NO LOTE`}
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

        {/* Listagem de Notas Fiscais */}
        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[350px] pr-2">
          {selectedItems.map(itemId => {
            const opcao = opcoesEscolha.find(o => String(o.id) === itemId);
            const data = nfsData[itemId] || {};
            return (
              <div key={itemId} className="p-4 border rounded-lg bg-gray-50/50 space-y-4 border-l-4 border-l-[#1a2e4a] animate-in fade-in slide-in-from-left-2">
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
                    <Input 
                        className="h-9 font-mono bg-white" 
                        type="number"
                        step="0.01"
                        value={data.valor} 
                        onChange={e => setNfsData({...nfsData, [itemId]: {...data, valor: parseFloat(e.target.value)}})} 
                    />
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
          className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white px-10 h-11 font-black uppercase text-[10px] shadow-lg transition-all"
        >
          {saving ? <Loader2 className="animate-spin h-4 w-4" /> : `Gravar ${selectedItems.length} Lançamentos`}
        </Button>
      </div>
    </div>
  );
}