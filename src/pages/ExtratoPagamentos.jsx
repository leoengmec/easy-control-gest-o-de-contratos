import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      try {
        const [resL, resC] = await Promise.all([
          base44.entities.LancamentoFinanceiro.list("-data_nf"),
          base44.entities.Contrato.list()
        ]);
        setLancamentos(resL || []);
        setContratos(resC || []);
      } catch (e) {
        toast.error("Erro ao carregar dados financeiros.");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const toggleStatus = (s) => {
    setStatusSelecionados(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const filtrados = lancamentos.filter(l => {
    const c = contratos.find(con => con.id === l.contrato_id);
    const termo = busca.toLowerCase();
    const matchBusca = l.numero_nf?.toLowerCase().includes(termo) || 
                      c?.numero?.toLowerCase().includes(termo) ||
                      c?.contratada?.toLowerCase().includes(termo);
    const matchStatus = statusSelecionados.length === 0 || statusSelecionados.includes(l.status);
    return matchBusca && matchStatus;
  });

  const total = filtrados.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  if (loading) return <div className="p-10 text-center font-bold text-[#1a2e4a]">Sincronizando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#1a2e4a] uppercase">Extrato de Pagamentos</h1>
          <p className="text-sm font-bold text-blue-600 uppercase">JFRN - Gestão Orçamentária</p>
        </div>
        <Card className="bg-[#1a2e4a] text-white p-4">
          <div className="text-[10px] uppercase font-bold opacity-70">Soma Total Filtrada</div>
          <div className="text-2xl font-black">{fmt(total)}</div>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input 
            placeholder="Buscar por NF, Número do Contrato ou Empresa..." 
            className="pl-10 h-12 text-lg border-gray-300"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <span className="text-xs font-black uppercase text-gray-400">Filtrar Status:</span>
          {["SOF", "Pago", "Aprovisionado", "Cancelado"].map(s => (
            <div key={s} className="flex items-center space-x-2">
              <Checkbox id={s} checked={statusSelecionados.includes(s)} onCheckedChange={() => toggleStatus(s)} />
              <label htmlFor={s} className="text-sm font-bold uppercase cursor-pointer">{s}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow className="h-14">
              <TableHead className="text-[10px] font-black uppercase">Data NF / Número</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Contrato / Empresa</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right">Valor Bruto</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map(l => {
              const c = contratos.find(con => con.id === l.contrato_id);
              return (
                <TableRow key={l.id} className="h-20 hover:bg-blue-50/30">
                  <TableCell>
                    <div className="text-xl font-black text-[#1a2e4a]">
                      {l.data_nf ? format(parseISO(l.data_nf), "dd/MM/yyyy") : "—"}
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase">NF: {l.numero_nf || "S/N"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-base font-black text-amber-700 uppercase">{c?.numero || "N/A"}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[250px]">{c?.contratada}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-2xl font-black text-[#1a2e4a]">{fmt(l.valor)}</div>
                    {l.glosa > 0 && <div className="text-[10px] font-bold text-red-500 uppercase">Glosa: {fmt(l.glosa)}</div>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="font-black uppercase text-[10px] px-3 py-1">{l.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}