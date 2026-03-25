import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, FileSearch, Upload, Package, PenTool } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dados de Apoio
  const [contratos, setContratos] = useState([]);
  const [itensDoContrato, setItensDoContrato] = useState([]);
  
  // Estados do Formulário
  const [contratoId, setContratoId] = useState("");
  const [itemId, setItemId] = useState("");
  const [tipoItem, setTipoItem] = useState(""); // 'servico' ou 'material'
  const [locaisSelecionados, setLocaisSelecionados] = useState([]);

  const [dadosNF, setDadosNF] = useState({
    numero_nf: "", data_nf: "", valor: 0, valor_pago_final: 0,
    processo_sei: "", os_numero: "", data_os: "",
    material_desc: "", unidade: "UN", quantidade: 1, valor_unitario: 0
  });

  const locaisOpcoes = ["Sede Natal", "Subseção Mossoró", "Subseção Caicó", "Subseção Assu", "Subseção Pau dos Ferros"];

  useEffect(() => {
    base44.entities.Contrato.list().then(setContratos);
  }, []);

  // Busca itens quando o contrato é selecionado
  useEffect(() => {
    if (contratoId) {
      base44.entities.ItemContrato.filter({ contrato_id: contratoId })
        .then(setItensDoContrato);
    }
  }, [contratoId]);

  const limparFormulario = () => {
    setContratoId("");
    setItemId("");
    setTipoItem("");
    setLocaisSelecionados([]);
    setDadosNF({
      numero_nf: "", data_nf: "", valor: 0, valor_pago_final: 0,
      processo_sei: "", os_numero: "", data_os: "",
      material_desc: "", unidade: "UN", quantidade: 1, valor_unitario: 0
    });
    setIsModalOpen(false);
  };

  const handleMoneyInput = (field, val) => {
    const clean = val.replace(/\D/g, "");
    setDadosNF(prev => ({ ...prev, [field]: Number(clean) }));
  };

  const handleSalvar = async () => {
    if (!contratoId || !itemId) return toast.error("Selecione Contrato e Item.");
    setLoading(true);

    try {
      const itemSelecionado = itensDoContrato.find(i => String(i.id) === itemId);
      const dataISO = dadosNF.data_nf.split("/").reverse().join("-");
      const agora = new Date().toISOString();

      // 1. Gravação Financeira (Comum a todos)
      const lanc = await base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoId,
        item_contrato_id: itemId,
        item_label: itemSelecionado?.nome,
        numero_nf: dadosNF.numero_nf,
        data_nf: dataISO,
        valor: dadosNF.valor / 100,
        valor_pago_final: (dadosNF.valor_pago_final || dadosNF.valor) / 100,
        processo_pagamento_sei: dadosNF.processo_sei,
        status: "Em instrução",
        ano: new Date(dataISO).getFullYear(),
        mes: new Date(dataISO).getMonth() + 1,
        data_lancamento: agora.split("T")[0],
        responsavel_por_lancamento: user?.full_name || user?.email
      });

      // 2. Gravação de Material (Apenas se for tipo Material)
      if (tipoItem === "material") {
        await base44.entities.ItemMaterialNF.create({
          lancamento_financeiro_id: lanc.id,
          contrato_id: contratoId,
          numero_nf: dadosNF.numero_nf,
          data_nf: dataISO,
          os_numero: dadosNF.os_numero,
          os_data: dadosNF.data_os ? dadosNF.data_os.split("/").reverse().join("-") : null,
          os_local: locaisSelecionados.join(", "),
          descricao: dadosNF.material_desc,
          unidade: dadosNF.unidade,
          quantidade: dadosNF.quantidade,
          valor_unitario: dadosNF.valor_unitario / 100,
          valor_total_item: (dadosNF.quantidade * dadosNF.valor_unitario) / 100,
          valor_total_nota: dadosNF.valor / 100
        });
      }

      toast.success("Lançamento realizado com sucesso!");
      limparFormulario();
    } catch (e) {
      toast.error("Erro ao gravar no banco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Button onClick={() => setIsModalOpen(true)} className="bg-blue-900 font-black uppercase text-xs">
        <Upload className="mr-2 w-4 h-4" /> Novo Lançamento (PDF)
      </Button>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && limparFormulario()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-t-8 border-blue-900">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-blue-900 flex items-center gap-2">
              <FileSearch /> Processar Nova Nota Fiscal
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-8 py-4">
            {/* COLUNA ESQUERDA: VINCULAÇÃO E NF */}
            <div className="space-y-4 border-r pr-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">1. Contrato e Item</Label>
                <Select value={contratoId} onValueChange={setContratoId}>
                  <SelectTrigger className="h-10 border-blue-200"><SelectValue placeholder="Selecione o Contrato" /></SelectTrigger>
                  <SelectContent>{contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} - {c.contratada}</SelectItem>)}</SelectContent>
                </Select>
                
                <Select value={itemId} onValueChange={(val) => {
                  setItemId(val);
                  const item = itensDoContrato.find(i => String(i.id) === val);
                  setTipoItem(item?.natureza || "servico"); // Natureza deve vir do BD
                }}>
                  <SelectTrigger className="h-10 border-blue-200"><SelectValue placeholder="Selecione o Item" /></SelectTrigger>
                  <SelectContent>{itensDoContrato.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
                
                {tipoItem && (
                  <Badge variant="outline" className={`uppercase font-black text-[9px] ${tipoItem === 'material' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    Tipo Detectado: {tipoItem}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">2. Dados da Nota Fiscal</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nº NF" value={dadosNF.numero_nf} onChange={e => setDadosNF({...dadosNF, numero_nf: e.target.value})} />
                  <Input placeholder="Data NF (DD/MM/AAAA)" value={dadosNF.data_nf} onChange={e => setDadosNF({...dadosNF, data_nf: e.target.value})} />
                </div>
                <Input placeholder="Processo SEI" value={dadosNF.processo_sei} onChange={e => setDadosNF({...dadosNF, processo_sei: e.target.value})} />
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold">Valor Bruto NF</Label>
                  <Input className="font-mono font-bold text-blue-900" value={(dadosNF.valor / 100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} onChange={e => handleMoneyInput('valor', e.target.value)} />
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: OS E DETALHES DE MATERIAL */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">3. Dados da OS</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nº OS" value={dadosNF.os_numero} onChange={e => setDadosNF({...dadosNF, os_numero: e.target.value})} />
                  <Input placeholder="Data OS" value={dadosNF.data_os} onChange={e => setDadosNF({...dadosNF, data_os: e.target.value})} />
                </div>
                <Label className="text-[9px] font-bold">Local de Prestação (Múltipla)</Label>
                <div className="grid grid-cols-1 gap-1 border p-2 rounded bg-slate-50 max-h-32 overflow-y-auto">
                  {locaisOpcoes.map(loc => (
                    <div key={loc} className="flex items-center gap-2">
                      <Checkbox id={loc} onCheckedChange={(checked) => setLocaisSelecionados(p => checked ? [...p, loc] : p.filter(x => x !== loc))} />
                      <label htmlFor={loc} className="text-[10px] font-bold uppercase cursor-pointer">{loc}</label>
                    </div>
                  ))}
                </div>
              </div>

              {tipoItem === "material" && (
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1">
                    <Package size={12}/> Detalhes para Controle de Material
                  </Label>
                  <Input placeholder="Descrição do Material" value={dadosNF.material_desc} onChange={e => setDadosNF({...dadosNF, material_desc: e.target.value})} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Qtd" type="number" value={dadosNF.quantidade} onChange={e => setDadosNF({...dadosNF, quantidade: e.target.value})} />
                    <Input placeholder="Unid (UN, M...)" value={dadosNF.unidade} onChange={e => setDadosNF({...dadosNF, unidade: e.target.value})} />
                    <Input placeholder="V. Unit" value={(dadosNF.valor_unitario / 100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} onChange={e => handleMoneyInput('valor_unitario', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={limparFormulario} className="font-bold uppercase text-[10px]">Cancelar e Limpar</Button>
            <Button onClick={handleSalvar} disabled={loading} className="bg-blue-900 font-black uppercase text-xs px-10">
              {loading ? <Loader2 className="animate-spin" /> : "Gravar Lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}