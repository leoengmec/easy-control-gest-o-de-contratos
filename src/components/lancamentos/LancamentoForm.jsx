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
import { toast } from "sonner";
import { Loader2, FileSearch, Upload, Filter, Trash2, Edit, ShieldCheck } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Lancamentos() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === "Administrador";
  const anoAtual = new Date().getFullYear().toString();

  // Estados de Dados
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [itensContrato, setItensContrato] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de Filtro
  const [filtroAno, setFiltroAno] = useState(anoAtual);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Estados do Modal de PDF
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contratoId, setContratoId] = useState("");
  const [locaisSelecionados, setLocaisSelecionados] = useState([]);
  const [dadosNF, setDadosNF] = useState({
    numero_nf: "", data_nf: "", valor: 0, os_numero: "", data_os: "", item_label: ""
  });

  const locaisOpcoes = ["Sede Natal", "Subseção Mossoró", "Subseção Caicó", "Subseção Assu", "Subseção Pau dos Ferros"];

  useEffect(() => {
    carregarDadosIniciais();
  }, [filtroAno]);

  const carregarDadosIniciais = async () => {
    setLoading(true);
    try {
      const [resContratos, resLanc] = await Promise.all([
        base44.entities.Contrato.list(),
        base44.entities.LancamentoFinanceiro.filter({ ano: parseInt(filtroAno) })
      ]);
      setContratos(resContratos || []);
      setLancamentos(resLanc || []);
    } catch (e) { toast.error("Erro ao carregar dados."); }
    finally { setLoading(false); }
  };

  // 💰 Lógica de Moeda (10 -> 0,10)
  const handleMoneyInput = (val) => {
    const clean = val.replace(/\D/g, "");
    setDadosNF({ ...dadosNF, valor: Number(clean) });
  };

  // 📄 Extração PDF Calibrada
  const handlePDFExtrair = async (file) => {
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
        
        // Regex JFRN
        const nf = text.match(/NF\s*[:\-\s]*(\d+)/i)?.[1] || "";
        const data = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
        const valorMatch = text.match(/(?:TOTAL|VALOR|R\$)\s*[:\-\s]*([\d\.,]+)/i);

        setDadosNF({
          ...dadosNF,
          numero_nf: nf,
          data_nf: data,
          valor: valorMatch ? parseFloat(valorMatch[1].replace(".", "").replace(",", ".")) * 100 : 0
        });
        toast.success("PDF processado!");
      } catch (e) { toast.error("Falha na leitura."); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header e Botão Novo */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-[#1a2e4a] uppercase italic">Lançamentos {filtroAno}</h1>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-900 font-black uppercase text-xs h-12">
          <Upload className="mr-2 w-4 h-4" /> Novo Lançamento (PDF)
        </Button>
      </div>

      {/* 2. Área de Filtros */}
      <Card className="p-4 bg-slate-50 border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Mês/Ano</Label>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Contrato</Label>
          <Select value={filtroContrato} onValueChange={setFiltroContrato}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="SOF">SOF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 3. Tabela de Resultados */}
      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">Data/NF</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Item Orçamentário</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Valor</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-bold">{l.numero_nf} <br/><span className="text-[9px] text-gray-400">{l.data_nf}</span></TableCell>
                <TableCell className="text-xs font-medium uppercase">{l.item_label}</TableCell>
                <TableCell className="font-mono font-bold">R$ {l.valor?.toLocaleString()}</TableCell>
                <TableCell><Badge className="text-[9px] uppercase">{l.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {isAdmin && (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Edit size={14}/></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"><Trash2 size={14}/></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 4. Modal de Novo Lançamento (PDF) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl border-t-8 border-blue-900">
          <DialogHeader><DialogTitle className="font-black uppercase text-blue-900">Extração de Nota e OS</DialogTitle></DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 py-4">
             {/* Esquerda: NF */}
             <div className="space-y-4 border-r pr-6">
                <Label className="text-blue-700 font-black uppercase text-[11px]">Dados da Nota Fiscal</Label>
                <Input type="file" accept="application/pdf" onChange={(e) => handlePDFExtrair(e.target.files[0])} />
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Nº NF</Label>
                  <Input value={dadosNF.numero_nf} onChange={e => setDadosNF({...dadosNF, numero_nf: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-blue-600">Valor Total (Centavos First)</Label>
                  <Input className="font-mono text-lg font-bold" value={(dadosNF.valor / 100).toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})} onChange={e => handleMoneyInput(e.target.value)} />
                </div>
             </div>

             {/* Direita: OS e Local */}
             <div className="space-y-4">
                <Label className="text-amber-700 font-black uppercase text-[11px]">Dados da OS / Localização</Label>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Nº OS</Label>
                  <Input value={dadosNF.os_numero} onChange={e => setDadosNF({...dadosNF, os_numero: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Locais de Prestação (Múltipla Escolha)</Label>
                  <div className="grid grid-cols-1 gap-2 border p-3 rounded-md bg-slate-50">
                    {locaisOpcoes.map(local => (
                      <div key={local} className="flex items-center gap-2">
                        <Checkbox id={local} onCheckedChange={(checked) => {
                          setLocaisSelecionados(prev => checked ? [...prev, local] : prev.filter(l => l !== local));
                        }} />
                        <label htmlFor={local} className="text-[10px] font-bold uppercase cursor-pointer">{local}</label>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-900 font-black uppercase text-xs px-10">Confirmar Lançamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}