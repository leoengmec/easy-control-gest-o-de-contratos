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

// Aglutinadores conforme regra de negócio [cite: 27, 28]
const AGLUTINADORES = [
  { 
    id: "mor-natal", 
    nome: "MOR Natal", 
    subitens: [
      "SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA NATAL",
      "SERVIÇOS DE ARTÍFICE DE ELÉTRICA NATAL",
      "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL NATAL",
      "SERVIÇOS DE ARTÍFICE CIVIL NATAL",
      "ENGENHEIRO DE CAMPO NATAL"
    ]
  },
  {
    id: "mor-mossoro",
    nome: "MOR Mossoró",
    subitens: [
      "SERVIÇOS DE AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ",
      "SERVIÇOS DE ARTÍFICE ELÉTRICA MOSSORÓ",
      "SERVIÇOS DE AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ",
      "SERVIÇOS DE ARTÍFICE CIVIL MOSSORÓ"
    ]
  }
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
  const [selectedItems, setSelectedItems] = useState([]); // IDs ou Nomes dos Aglutinadores/Itens
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
  const [extractingPdf, setExtractingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  // Filtra itens originais: remove postos individuais que pertencem aos aglutinadores [cite: 26]
  const subitensIgnorar = AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]);
  const itensFiltrados = itens?.filter(i => 
    String(i.contrato_id) === contratoId && !subitensIgnorar.includes(i.nome?.toUpperCase())
  ) || [];

  // Itens finais para a lista de escolha: Aglutinadores + Itens de Serviço (Material, etc)
  const opcoesEscolha = [...AGLUTINADORES, ...itensFiltrados];

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

  const toggleItem = (item) => {
    const idStr = String(item.id);
    setSelectedItems(prev => {
      if (prev.includes(idStr)) {
        return prev.filter(id => id !== idStr);
      } else {
        setNfsData(current => ({
          ...current,
          [idStr]: { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0, valor_final: 0 }
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

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: { type: "object", properties: { numero_nf: { type: "string" }, data_nf: { type: "string" }, valor_total: { type: "number" } } }
      });
      if (result.output) {
        const d = result.output;
        let df = hoje;
        if (d.data_nf?.includes("/")) {
          const p = d.data_nf.split("/");
          df = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        setNfsData(prev => {
          const next = { ...prev };
          selectedItems.forEach((id) => {
            next[id] = { ...next[id], numero_nf: d.numero_nf, data_nf: df, valor: d.valor_total, valor_final: d.valor_total };
          });
          return next;
        });
        toast.success("Dados preenchidos via IA.");
      }
    } catch (err) { toast.error("Falha no OCR."); }
    finally { setExtractingPdf(false); }
  };

  const executeSave = async () => {
    if (saving) return;
    if (!contratoId || selectedItems.length === 0) return toast.error("Preencha Contrato e Itens.");

    setSaving(true);
    try {
      // Regra 2: Apenas itens que NÃO são MOR abrem OS [cite: 61]
      const deveEnviarOS = selectedItems.some(id => !["mor-natal", "mor-mossoro"].includes(id));
      const payloadOS = deveEnviarOS ? ordensServico.map(os => ({
        numero: os.numero_os || "",
        data_emissao: os.data_emissao || "",
        descricao: os.descricao || "",
        valor: os.valor || 0,
        data_execucao: os.data_execucao || "",
        locais_prestacao_servicos: os.locais || []
      })) : [];

      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const label = opcoesEscolha.find(o => String(o.id) === itemId)?.nome;

        await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          item_label: label,
          mes: mesesNomes.indexOf(mes) + 1,
          ano: parseInt(ano),
          status,
          numero_nf: nf.numero_nf,
          data_nf: nf.data_nf,
          valor: nf.valor,
          retencao: nf.retencao,
          glosa: nf.glosa,
          valor_pago_final: nf.valor_final,
          processo_pagamento_sei: processoPagSei,
          ordem_bancaria: ordemBancaria,
          data_lancamento: dataLancamento,
          observacoes: observacoes,
          ordens_servico: payloadOS
        });
      }

      toast.success("Salvo com sucesso!");
      
      // Regra 1: Simplesmente limpar os campos e ficar na mesma página 
      setSelectedItems([]);
      setNfsData({});
      setOrdensServico([{ id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, data_execucao: "", locais: [] }]);
      setProcessoPagSei("");
      setOrdemBancaria("");
      setObservacoes("");
      
      if (onSave) onSave();
    } catch (err) { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Novo Lançamento</h2>
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

        <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/30">
          <h3 className="text-sm font-semibold mb-4 text-gray-400 uppercase text-[10px]">Mês de Referência da Medição</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-[10px] font-bold uppercase">Mês *</Label>
              <Select value={mes} onValueChange={setMes}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Ano *</Label>
              <Select value={ano} onValueChange={setAno}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Status *</Label>
              <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Itens do Contrato * <span className="text-gray-400 font-normal text-xs">(selecione aglutinadores ou serviços)</span></Label>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 border-gray-300">{selectedItems.length === 0 ? "Selecione..." : `${selectedItems.length} selecionado(s)`}</Button></PopoverTrigger>
            <PopoverContent className="w-[400px] p-2 bg-white shadow-xl">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {opcoesEscolha.map(opcao => (
                  <div key={opcao.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded">
                    <Checkbox id={`it-${opcao.id}`} checked={selectedItems.includes(String(opcao.id))} onCheckedChange={() => toggleItem(opcao)} />
                    <label htmlFor={`it-${opcao.id}`} className="text-sm font-medium uppercase cursor-pointer">{opcao.nome}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {selectedItems.length > 0 && (
          <div className="space-y-6 pt-4 border-t">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black text-[#1a2e4a] uppercase text-gray-400">Notas Fiscais</h3>
              <Button variant="outline" size="sm" className="text-blue-600 h-9" onClick={() => pdfInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Importar PDF da NF
              </Button>
              <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" onChange={handlePdfUpload} />
            </div>

            {selectedItems.map(itemId => {
              const label = opcoesEscolha.find(o => String(o.id) === itemId)?.nome;
              const data = nfsData[itemId] || {};
              return (
                <div key={itemId} className="p-6 border rounded-xl bg-white space-y-4 border-l-4 border-l-[#1a2e4a] shadow-sm">
                  <div className="text-xs font-black text-[#1a2e4a] uppercase border-b pb-2">{label}</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1"><Label className="text-[10px] font-bold text-gray-500">Nº NF *</Label><Input value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-bold text-gray-500">Data NF *</Label><Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-bold text-gray-500">Valor NF (R$) *</Label><Input value={formatarMoeda(data.valor)} onChange={e => handleNFMoneyChange(itemId, "valor", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1"><Label className="text-[10px] font-bold text-red-500">Retenção (R$)</Label><Input value={formatarMoeda(data.retencao)} onChange={e => handleNFMoneyChange(itemId, "retencao", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-bold text-red-500">Glosa (R$)</Label><Input value={formatarMoeda(data.glosa)} onChange={e => handleNFMoneyChange(itemId, "glosa", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black text-green-500">Valor Final Pago</Label><Input disabled className="bg-green-50 font-black" value={formatarMoeda(data.valor_final)} /></div>
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Processo de Pagamento SEI</Label><Input value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="Nº do processo" /></div>
              <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Ordem Bancária</Label><Input value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="Nº da OB" /></div>
            </div>

            {/* Regra 2: Bloco OS só para itens que NÃO são MOR [cite: 61] */}
            {selectedItems.some(id => !["mor-natal", "mor-mossoro"].includes(id)) && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center"><h3 className="text-sm font-black text-[#1a2e4a] uppercase text-gray-400">Ordens de Serviço</h3><Button variant="outline" size="sm" onClick={() => setOrdensServico([...ordensServico, { id: Date.now(), locais: [] }])}><Plus className="h-4 w-4 mr-1" /> Adicionar OS</Button></div>
                {ordensServico.map((os, i) => (
                  <div key={os.id} className="border rounded-lg p-5 bg-gray-50/30 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold">Nº OS *</Label><Input value={os.numero_os} onChange={e => { const up = [...ordensServico]; up[i].numero_os = e.target.value; setOrdensServico(up); }} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold">Valor OS *</Label><Input value={formatarMoeda(os.valor)} onChange={e => { const v = Number(e.target.value.replace(/\D/g, "")) / 100; const up = [...ordensServico]; up[i].valor = v; setOrdensServico(up); }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
              <Button variant="ghost" onClick={onCancel} disabled={saving} className="font-bold uppercase text-xs">Cancelar</Button>
              <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] text-white px-10 h-12 font-black uppercase text-xs tracking-widest">
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Salvar lançamento"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}