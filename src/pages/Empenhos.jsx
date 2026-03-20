import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Plus, Edit, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Empenhos() {
  const [loading, setLoading] = useState(true);
  const [empenhos, setEmpenhos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [buscaNE, setBuscaNE] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    contrato_id: "",
    numero_empenho: "",
    ano: "2026",
    valor_total: "",
    valor_saldo: "",
    data_emissao: "",
    observacoes: ""
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [resEmpenhos, resContratos] = await Promise.all([
        base44.entities.NotaEmpenho.list("-created_date", 1000),
        base44.entities.Contrato.list()
      ]);
      setEmpenhos(resEmpenhos || []);
      setContratos(resContratos || []);
    } catch (error) {
      toast.error("Erro ao carregar Notas de Empenho.");
    } finally {
      setLoading(false);
    }
  }

  const formatMoneyInput = (value) => {
    if (!value) return "";
    const cleanValue = value.toString().replace(/\D/g, "");
    if (cleanValue === "") return "";
    const numberValue = Number(cleanValue) / 100;
    return numberValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseMoneyValue = (formattedValue) => {
    if (!formattedValue) return 0;
    const cleanStr = formattedValue.toString().replace(/\./g, "").replace(",", ".");
    return Number(cleanStr);
  };

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleOpenModal = (empenho = null) => {
    if (empenho) {
      setEditId(empenho.id);
      setFormData({
        contrato_id: empenho.contrato_id || "",
        numero_empenho: empenho.numero_empenho || "",
        ano: empenho.ano?.toString() || "2026",
        valor_total: formatMoneyInput((empenho.valor_total || 0).toFixed(2).replace(".", "")),
        valor_saldo: formatMoneyInput((empenho.valor_saldo || 0).toFixed(2).replace(".", "")),
        data_emissao: empenho.data_emissao || "",
        observacoes: empenho.observacoes || ""
      });
    } else {
      setEditId(null);
      setFormData({
        contrato_id: "",
        numero_empenho: "",
        ano: "2026",
        valor_total: "",
        valor_saldo: "",
        data_emissao: new Date().toISOString().split("T")[0],
        observacoes: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contrato_id || !formData.numero_empenho) {
      toast.error("Preencha o contrato e o número do empenho.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        contrato_id: formData.contrato_id,
        numero_empenho: formData.numero_empenho,
        ano: parseInt(formData.ano),
        valor_total: parseMoneyValue(formData.valor_total),
        valor_saldo: parseMoneyValue(formData.valor_saldo),
        data_emissao: formData.data_emissao,
        observacoes: formData.observacoes
      };

      if (editId) {
        await base44.entities.NotaEmpenho.update(editId, payload);
        toast.success("Empenho atualizado com sucesso!");
      } else {
        await base44.entities.NotaEmpenho.create(payload);
        toast.success("Empenho criado com sucesso!");
      }
      setIsModalOpen(false);
      carregarDados();
    } catch (error) {
      toast.error("Erro ao salvar o empenho.");
    } finally {
      setSaving(false);
    }
  };

  const empenhosFiltrados = empenhos.filter(e => 
    !buscaNE || e.numero_empenho?.toLowerCase().includes(buscaNE.toLowerCase())
  );

  const getDadosContrato = (id) => {
    const contrato = contratos.find(c => String(c.id) === String(id));
    return contrato ? `${contrato.numero} | ${contrato.contratada}` : "Contrato não encontrado";
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
      <p className="font-black text-[#1a2e4a] uppercase tracking-widest text-lg">Carregando Empenhos...</p>
    </div>
  );

  return (
    <div className="space-y-6 font-sans pb-10 max-w-7xl mx-auto">
      
      {/* Cabeçalho */}
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] tracking-tight uppercase leading-none">Notas de Empenho</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-2">Gestão de Crédito Orçamentário JFRN</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold py-6 px-6 shadow-lg uppercase">
          <Plus className="mr-2 h-5 w-5" /> Novo Empenho
        </Button>
      </div>

      {/* Filtros */}
      <Card className="bg-white border-none shadow-md ring-1 ring-black/5 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md space-y-1">
            <Label className="text-[10px] font-black uppercase text-gray-500">Pesquisar por NE</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-9 h-10 bg-gray-50 border-gray-200 font-bold" 
                placeholder="Ex: 2026NE000123" 
                value={buscaNE} 
                onChange={(e) => setBuscaNE(e.target.value)} 
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela de Listagem */}
      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow className="hover:bg-[#1a2e4a] border-none">
              <TableHead className="text-white font-black py-5 uppercase text-xs">Número do Empenho / Ano</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Contrato</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-xs">Valor Total</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-xs pr-6">Saldo</TableHead>
              <TableHead className="text-center text-white font-black uppercase text-xs">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empenhosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-gray-400 font-bold uppercase text-sm">
                  Nenhum empenho encontrado.
                </TableCell>
              </TableRow>
            ) : (
              empenhosFiltrados.map((empenho) => {
                const total = Number(empenho.valor_total || 0);
                const saldo = Number(empenho.valor_saldo || 0);
                const isCritico = saldo < (total * 0.1);

                return (
                  <TableRow key={empenho.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-100">
                    <TableCell className="py-4">
                      <div className="font-black text-[#1a2e4a] text-lg">{empenho.numero_empenho}</div>
                      <div className="text-[11px] text-gray-500 font-bold mt-0.5">Exercício: {empenho.ano}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-gray-700 uppercase leading-tight">
                        {getDadosContrato(empenho.contrato_id)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-gray-600 text-sm">
                      {formatBRL(total)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-black text-lg ${isCritico ? 'text-red-600' : 'text-[#1a2e4a]'}`}>
                          {formatBRL(saldo)}
                        </span>
                        {isCritico && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] uppercase shadow-none px-2 py-0">
                            <AlertCircle className="w-3 h-3 mr-1" /> Saldo Crítico
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(empenho)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-100">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-xl">
          <DialogHeader className="bg-[#1a2e4a] p-6 text-white">
            <DialogTitle className="text-xl font-black tracking-tight uppercase">
              {editId ? 'Editar Nota de Empenho' : 'Nova Nota de Empenho'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Contrato Vinculado *</Label>
              <Select value={formData.contrato_id} onValueChange={(v) => setFormData({...formData, contrato_id: v})}>
                <SelectTrigger className="h-12 border-gray-300 font-medium">
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Número do Empenho *</Label>
                <Input 
                  required
                  placeholder="Ex: 2026NE000001" 
                  className="h-12 border-gray-300 font-bold uppercase"
                  value={formData.numero_empenho}
                  onChange={(e) => setFormData({...formData, numero_empenho: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Exercício (Ano) *</Label>
                <Input 
                  required
                  type="number"
                  className="h-12 border-gray-300 font-bold"
                  value={formData.ano}
                  onChange={(e) => setFormData({...formData, ano: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Valor Total (R$) *</Label>
                <Input 
                  required
                  placeholder="0,00" 
                  className="h-12 border-gray-300 font-mono text-lg"
                  value={formData.valor_total}
                  onChange={(e) => setFormData({...formData, valor_total: formatMoneyInput(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Valor Saldo (R$) *</Label>
                <Input 
                  required
                  placeholder="0,00" 
                  className="h-12 border-gray-300 font-mono text-lg"
                  value={formData.valor_saldo}
                  onChange={(e) => setFormData({...formData, valor_saldo: formatMoneyInput(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Data de Emissão</Label>
                <Input 
                  type="date"
                  className="h-12 border-gray-300"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-[#1a2e4a] text-xs uppercase">Observações</Label>
              <Textarea 
                placeholder="Informações adicionais..."
                className="border-gray-300 resize-none h-24"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-12 px-6 font-bold uppercase text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white h-12 px-10 font-black uppercase text-xs shadow-lg">
                {saving ? <Loader2 className="animate-spin h-5 w-5" /> : "Salvar Empenho"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}