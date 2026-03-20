import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Calendar, User, History } from "lucide-react";
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
      } catch (e) { toast.error("Erro na carga."); }
      finally { setLoading(false); }
    };
    carregar();
  }, []);

  const dadosFiltrados = lancamentos.filter(l => {
    const c = contratos.find(con => con.id === l.contrato_id);
    const matchBusca = l.numero_nf?.includes(busca) || c?.numero?.includes(busca);
    const matchStatus = statusSelecionados.length === 0 || statusSelecionados.includes(l.status);
    return matchBusca && matchStatus;
  });

  if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRONIZANDO EXTRATO...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-4xl font-black text-[#1a2e4a] uppercase tracking-tighter">Extrato de Pagamentos</h1>
      
      {/* Filtros Múltiplos de Status */}
      <div className="bg-white p-6 rounded-xl border-2 flex flex-wrap gap-6 items-center">
        <div className="text-xs font-black uppercase text-gray-400">Filtrar Status:</div>
        {["Pago", "Aprovisionado", "SOF", "Cancelado"].map(s => (
          <div key={s} className="flex items-center space-x-2">
            <Checkbox 
              id={s} 
              checked={statusSelecionados.includes(s)} 
              onCheckedChange={() => setStatusSelecionados(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} 
            />
            <label htmlFor={s} className="text-sm font-bold uppercase cursor-pointer">{s}</label>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 bg-white overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow>
              <TableHead className="text-white font-black uppercase text-xs">Data NF / Número</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Contrato</TableHead>
              <TableHead className="text-white font-black uppercase text-xs text-right">Valor Bruto</TableHead>
              <TableHead className="text-white font-black uppercase text-xs text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.map(l => {
              const c = contratos.find(con => con.id === l.contrato_id);
              return (
                <TableRow key={l.id} className="hover:bg-blue-50/40 h-16">
                  <TableCell>
                    <div className="font-black text-lg text-[#1a2e4a]">
                      {l.data_nf ? format(parseISO(l.data_nf), "dd/MM/yyyy") : "—"}
                    </div>
                    <div className="text-xs font-bold text-gray-400">NF: {l.numero_nf || "S/N"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-black text-amber-700">{c?.numero || "N/A"}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[200px]">{c?.contratada}</div>
                  </TableCell>
                  <TableCell className="text-right font-black text-xl text-[#1a2e4a]">{fmt(l.valor)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="font-black uppercase text-[10px]">{l.status}</Badge>
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