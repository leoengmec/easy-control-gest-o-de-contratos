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

// Configuração dos Aglutinadores de MOR [cite: 27, 28]
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
  const [selectedItems, setSelectedItems] = useState([]); 
  const [nfsData, setNfsData] = useState({});
  const [ordensServico, setOrdensServico] = useState({});
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [ordemBancaria, setOrdemBancaria] = useState("");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");

  const [listaContratos, setListaContratos] = useState(contratos || []);
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  // Regra: Filtrar postos individuais e itens desativados [cite: 27, 28]
  const subitensIgnorar = AGLUTINADORES.flatMap(a => a.subitens).concat(["SERVICOS DE AUXILIAR ADMINISTRATIVO NATAL"]);
  const itensFiltrados = itens?.filter(i => 
    String(i.contrato_id) === contratoId && !subitensIgnorar.includes(i.nome?.toUpperCase())
  ) || [];

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
        // Regra 2: Abrir OS para todos exceto MOR [cite: 61]
        if (!["mor-natal", "mor-mossoro"].includes(idStr)) {
          setOrdensServico(osPrev => ({
            ...osPrev,
            [idStr]: [{ id: Date.now(), numero_os: "", locais: [] }]
          }));
        }
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
        json_schema: { 
          type: "object", 
          properties: { numero_nf: { type: "string" }, data_nf: { type: "string" }, valor_total: { type: "number" } } 
        }
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
    } catch (err) { toast.error("Erro ao ler PDF."); }
    finally { setExtractingPdf(false); if (pdfInputRef.current) pdfInputRef.current.value = ""; }
  };

  const executeSave = async () => {
    if (saving) return;
    if (!contratoId || selectedItems.length === 0) return toast.error("Dados incompletos.");

    setSaving(true);
    try {
      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const label = opcoesEscolha.find(o => String(o.id) === itemId)?.nome;
        const ossDoItem = ordensServico[itemId] || [];

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
          ordens_servico: ossDoItem.map(os => ({
            numero: os.numero_os,
            valor: os.valor,
            locais: os.locais?.join(", ")
          }))
        });
      }

      toast.success("Lançamento guardado!");
      
      // Regra 1: Limpar campos para novo registo [cite: 114]
      setContratoId("");
      setSelectedItems([]);
      setNfsData({});
      setOrdensServico({});
      setProcessoPagSei("");
      setOrdemBancaria("");
      setObservacoes("");
    } catch (err) { toast.error("Erro ao guardar."); }
    finally { setSaving(false); if (onSave) onSave(); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Painel de Gestão Financeira (ADM)</h2>
        <Badge className="bg-[#1a2e4a] text-white uppercase text-[10px]">Ambiente de Controle</Badge>
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

        {selectedItems.map(itemId => {
          const itemOpcao = opcoesEscolha.find(o => String(o.id) === itemId);
          const data = nfsData[itemId] || {};
          const oss = ordensServico[itemId] || [];
          const empenho = empenhos.find(e => String(e.item_contrato_id) === itemId);

          return (
            <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-6 border-l-4 border-l-[#1a2e4a]">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#1a2e4a] uppercase">{itemOpcao?.nome}</span>
                  <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                  <Button variant="link" className="p-0 h-auto text-blue-600 text-[10px] w-fit" onClick={() => pdfInputRef.current?.click()} disabled={extractingPdf}>
                    {extractingPdf ? "A processar..." : "Importar PDF da NF"}
                  </Button>
                </div>
                {empenho && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">{empenho.numero_empenho}</Badge>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold">Nº NF *</Label><Input className="h-9" value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold">Data NF *</Label><Input className="h-9" type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold">Valor Bruto *</Label><Input className="h-9" value={formatarMoeda(data.valor)} onChange={e => handleNFMoneyChange(itemId, "valor", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold text-red-500">Retenção</Label><Input className="h-9" value={formatarMoeda(data.retencao)} onChange={e => handleNFMoneyChange(itemId, "retencao", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-red-500">Glosa</Label><Input className="h-9" value={formatarMoeda(data.glosa)} onChange={e => handleNFMoneyChange(itemId, "glosa", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black text-green-600 uppercase">Líquido Pago</Label><Input disabled className="h-9 bg-green-50 font-black text-green-700" value={formatarMoeda(data.valor_final)} /></div>
              </div>

              {/* Bloco de Ordens de Serviço (Condicional) [cite: 61] */}
              {!["mor-natal", "mor-mossoro"].includes(itemId) && (
                <div className="space-y-4 pt-4 border-t border-dashed">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-400">Ordens de Serviço</h4>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => {
                      const newOss = [...oss, { id: Date.now(), numero_os: "", locais: [] }];
                      setOrdensServico({...ordensServico, [itemId]: newOss});
                    }}><Plus className="w-3 h-3 mr-1" /> Adicionar OS</Button>
                  </div>
                  {oss.map((os, idx) => (
                    <div key={os.id} className="p-4 bg-gray-50 rounded border space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label className="text-[9px] font-bold">Nº OS *</Label><Input className="h-8 bg-white" value={os.numero_os} onChange={e => {
                          const up = [...oss]; up[idx].numero_os = e.target.value;
                          setOrdensServico({...ordensServico, [itemId]: up});
                        }} /></div>
                        <div className="space-y-1"><Label className="text-[9px] font-bold">Valor OS *</Label><Input className="h-8 bg-white" value={formatarMoeda(os.valor)} onChange={e => {
                          const val = Number(e.target.value.replace(/\D/g, "")) / 100;
                          const up = [...oss]; up[idx].valor = val;
                          setOrdensServico({...ordensServico, [itemId]: up});
                        }} /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-[9px] font-bold">Locais de Prestação *</Label>
                        <div className="grid grid-cols-3 gap-2 bg-white p-2 border rounded">
                          {CIDADES_OS.map(cid => (
                            <div key={cid} className="flex items-center space-x-1">
                              <Checkbox id={`os-${os.id}-${cid}`} checked={os.locais.includes(cid)} onCheckedChange={(c) => {
                                const up = [...oss];
                                up[idx].locais = c ? [...up[idx].locais, cid] : up[idx].locais.filter(l => l !== cid);
                                setOrdensServico({...ordensServico, [itemId]: up});
                              }} /><label htmlFor={`os-${os.id}-${cid}`} className="text-[9px] uppercase font-bold">{cid}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Processo de Pagamento SEI</Label><Input className="h-9" value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="Nº do processo" /></div>
          <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Ordem Bancária</Label><Input className="h-9" value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="Nº da OB" /></div>
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