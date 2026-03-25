import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileSearch, Upload, Trash2, Edit, Filter, User } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const isAdmin = user?.email === 'bielribeirogamer@gmail.com' || user?.perfil === "Administrador";
  const anoAtual = new Date().getFullYear();

  // Estados de Dados e Filtros
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtros da Interface
  const [filtroAno, setFiltroAno] = useState(anoAtual.toString());
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Dados do Lançamento (PDF)
  const [contratoId, setContratoId] = useState("");
  const [locaisSelecionados, setLocaisSelecionados] = useState([]);
  const [dadosNF, setDadosNF] = useState({
    numero_nf: "", data_nf: "", valor: 0, os_numero: "", data_os: "", item_label: "", status: "Em instrução"
  });

  const locaisOpcoes = ["Sede Natal", "Subseção Mossoró", "Subseção Caicó", "Subseção Assu", "Subseção Pau dos Ferros"];

  useEffect(() => {
    carregarDados();
  }, [filtroAno, filtroContrato, filtroStatus]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Regra 1 e 2: Filtro inicial pelo ano corrente
      const query = { ano: parseInt(filtroAno) };
      if (filtroContrato !== "todos") query.contrato_id = filtroContrato;
      if (filtroStatus !== "todos") query.status = filtroStatus;

      const [resLanc, resContratos] = await Promise.all([
        base44.entities.LancamentoFinanceiro.filter(query, "-data_lancamento"),
        base44.entities.Contrato.list()
      ]);
      setLancamentos(resLanc || []);
      setContratos(resContratos || []);
    } catch (e) { toast.error("Erro ao carregar lançamentos."); }
    finally { setLoading(false); }
  };

  const handleMoneyInput = (val) => {
    const clean = val.replace(/\D/g, "");
    setDadosNF({ ...dadosNF, valor: Number(clean) });
  };

  const handlePDF = async (file) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(s => s.str).join(" ");
        }
        
        const nf = text.match(/(?:NF|Nota|Nº)\s*[:\-\s]*(\d+)/i)?.[1] || "";
        const data = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
        const valorMatch = text.match(/(?:TOTAL|VALOR|R\$)\s*[:\-\s]*([\d\.,]+)/i);
        const osMatch = text.match(/(?:OS|Ordem de Serviço)[:\-\s]*([A-Z0-9\-\/]{3,15})/i);

        setDadosNF({
          ...dadosNF,
          numero_nf: nf,
          data_nf: data,
          os_numero: osMatch ? osMatch[1].trim() : "",
          valor: valorMatch ? parseFloat(valorMatch[1].replace(".", "").replace(",", ".")) * 100 : 0
        });
        toast.success("Dados extraídos!");
      } catch (e) { toast.error("Falha na leitura do PDF."); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] uppercase italic tracking-tighter">Lançamentos Financeiros</h1>
          <p className="text-xs text-gray-500 font-bold uppercase">Exercício {filtroAno}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-900 hover:bg-blue-800 font-black uppercase text-[10px] h-12 px-8 shadow-lg transition-all">
          <Upload className="mr-2 w-4 h-4" /> Novo Lançamento (PDF)
        </Button>
      </div>

      {/* Painel de Filtros (Mês, Contrato, Item, Status, Responsável) */}
      <Card className="p-4 bg-slate-50 border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 shadow-inner">
        <div className="space-y-1">
          <Label className="text-[9px] font-black uppercase opacity-60">Ano Referência</Label>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-[9px] font-black uppercase opacity-60">Filtrar Contrato</Label>
          <Select value={filtroContrato} onValueChange={setFiltroContrato}>
            <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Contratos</SelectItem>
              {contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} - {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] font-black uppercase opacity-60">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Em instrução">Em instrução</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="SOF">SOF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela de Notas */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">NF / Data</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Contrato / Item</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Responsável</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Valor Bruto</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 animate-pulse font-bold text-slate-400">CARREGANDO...</TableCell></TableRow>
            ) : lancamentos.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 font-bold uppercase text-xs">Nenhum lançamento em {filtroAno}</TableCell></TableRow>
            ) : (
              lancamentos.map(l => (
                <TableRow key={l.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-black text-[#1a2e4a]">{l.numero_nf} <br/><span className="text-[9px] text-slate-400 font-mono">{l.data_nf}</span></TableCell>
                  <TableCell className="text-[10px] font-bold uppercase max-w-[200px] truncate">{l.item_label}</TableCell>
                  <TableCell className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><User size={10}/> {l.responsavel_por_lancamento}</TableCell>
                  <TableCell className="font-mono font-bold">R$ {l.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>
                  <TableCell><Badge className="text-[8px] font-black uppercase">{l.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600"><Edit size={12}/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"><Trash2 size={12}/></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Extração (Regras 3 e 4) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl border-t-8 border-blue-900">
          <DialogHeader><DialogTitle className="font-black uppercase text-blue-900 tracking-tighter text-xl">Novo Lançamento (PDF)</DialogTitle></DialogHeader>
          
          <div className="grid grid-cols-2 gap-8 py-4">
             {/* Lado Esquerdo: NF */}
             <div className="space-y-4 border-r pr-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                   <Label className="text-[10px] font-black uppercase text-blue-700 block mb-2 text-center">Arraste a NF aqui</Label>
                   <Input type="file" accept="application/pdf" className="bg-white" onChange={(e) => handlePDF(e.target.files[0])} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase">Nº NF</Label>
                    <Input value={dadosNF.numero_nf} onChange={e => setDadosNF({...dadosNF, numero_nf: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase">Data NF</Label>
                    <Input value={dadosNF.data_nf} onChange={e => setDadosNF({...dadosNF, data_nf: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-blue-900">Valor Bruto (Digitação Contínua)</Label>
                  <Input className="font-mono text-xl font-black text-blue-900 h-14" value={(dadosNF.valor / 100).toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})} onChange={e => handleMoneyInput(e.target.value)} />
                </div>
             </div>

             {/* Lado Direito: OS e Local */}
             <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-amber-700">Nº Ordem de Serviço (OS)</Label>
                  <Input value={dadosNF.os_numero} onChange={e => setDadosNF({...dadosNF, os_numero: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Local de Prestação (Múltipla Escolha)</Label>
                  <div className="grid grid-cols-1 gap-1 border p-4 rounded-xl bg-slate-50 max-h-[180px] overflow-y-auto">
                    {locaisOpcoes.map(local => (
                      <div key={local} className="flex items-center space-x-2 py-1 border-b last:border-0 border-slate-200">
                        <Checkbox id={local} onCheckedChange={(checked) => {
                          setLocaisSelecionados(prev => checked ? [...prev, local] : prev.filter(l => l !== local));
                        }} />
                        <label htmlFor={local} className="text-[10px] font-bold uppercase text-slate-600 cursor-pointer flex-1">{local}</label>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>

          <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 rounded-b-lg">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
            <Button className="bg-blue-900 font-black uppercase text-xs px-10 h-11">Gravar Lançamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}