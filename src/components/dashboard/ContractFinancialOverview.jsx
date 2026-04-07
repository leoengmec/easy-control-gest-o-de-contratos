import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import GaugeChart from './GaugeChart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const ANOS = [2024, 2025, 2026, 2027, 2028];
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ContractFinancialOverview({ id = "Quadro", defaultAno = new Date().getFullYear() }) { // force rebuild
  const queryClient = useQueryClient();
  const [ano, setAno] = useState(defaultAno);
  const [contratoId, setContratoId] = useState("selecione");
  const [tipo, setTipo] = useState("todos");

  const { data: contratos = [], isLoading: loadingContratos } = useQuery({
    queryKey: ['contratos-user'],
    queryFn: async () => {
      return await base44.entities.Contrato.filter({ status: "ativo" });
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (contratos.length > 0 && contratoId === "selecione") {
      setContratoId(contratos[0].id);
    }
  }, [contratos, contratoId]);

  const { data: resumo, isLoading: loadingResumo, error, refetch } = useQuery({
    queryKey: [`resumo-contrato-${contratoId}-${ano}-${tipo}`],
    queryFn: async () => {
      if (contratoId === "selecione") return null;
      const res = await base44.functions.invoke('resumoContrato', { id: contratoId, ano, tipo });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: contratoId !== "selecione",
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
  });

  const atualizarSaldosMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('atualizarSaldosItemContrato', { contratoId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`resumo-contrato-${contratoId}-${ano}-${tipo}`] });
      toast.success("Saldos atualizados com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar saldos.");
    }
  });

  const handleRefresh = () => {
    toast.promise(
      atualizarSaldosMutation.mutateAsync(),
      {
        loading: 'Atualizando saldos...',
        success: 'Concluído!',
        error: 'Falha ao atualizar.'
      }
    );
  };

  if (loadingContratos) {
    return <Card className="p-8 text-center animate-pulse bg-slate-50"><div className="h-8 bg-slate-200 rounded w-1/3 mx-auto mb-4"></div><div className="h-32 bg-slate-200 rounded"></div></Card>;
  }

  const { itens = [], totais = { orcado: 0, pago: 0, aprovisionado: 0, saldo: 0, execucao: 0 } } = resumo || {};
  
  const chartDataPie = [
    { name: 'Pago', value: totais.pago, color: '#22c55e' },
    { name: 'Aprovisionado', value: totais.aprovisionado, color: '#f59e0b' },
    { name: 'Saldo', value: Math.max(0, totais.saldo), color: '#3b82f6' }
  ];

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b pb-4 pt-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-[#1a2e4a] text-lg">{id}</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-8 text-xs w-64 bg-white">
              <SelectValue placeholder="Selecione um contrato" />
            </SelectTrigger>
            <SelectContent>
              {contratos.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.numero} - {c.contratada?.substring(0,20)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-24 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-8 text-xs w-44 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os itens</SelectItem>
              <SelectItem value="fixos">Serviços Fixos</SelectItem>
              <SelectItem value="demandas">Demandas Eventuais</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={handleRefresh} disabled={atualizarSaldosMutation.isPending || contratoId === "selecione"}>
            <RefreshCcw className={`w-4 h-4 ${atualizarSaldosMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {loadingResumo ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-slate-100 rounded"></div>
            <div className="h-64 bg-slate-100 rounded"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 flex items-center gap-2 p-4 bg-red-50 rounded"><AlertTriangle className="w-5 h-5"/> Erro ao carregar dados.</div>
        ) : !resumo ? (
          <div className="text-slate-500 text-center p-8">Selecione um contrato para visualizar os dados.</div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap md:flex-nowrap justify-between gap-8">
              <div className="flex gap-8 justify-center flex-1">
                <GaugeChart value={totais.orcado > 0 ? (totais.pago / totais.orcado)*100 : 0} label="Pago vs Orçado" sublabel={`/ ${fmt(totais.orcado)}`} rawValue={totais.pago} />
                <GaugeChart value={totais.orcado > 0 ? (totais.aprovisionado / totais.orcado)*100 : 0} label="Aprov. vs Orçado" sublabel={`/ ${fmt(totais.orcado)}`} rawValue={totais.aprovisionado} color="#f59e0b" />
              </div>
              <div className="w-full md:w-64 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartDataPie} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {chartDataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={itens.slice(0, 20)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{fontSize: 10}} tickFormatter={(v)=>v.substring(0,10)+'...'} />
                  <YAxis tickFormatter={(v) => `R$ ${v/1000}k`} tick={{fontSize: 10}} />
                  <Tooltip formatter={(value) => fmt(value)} />
                  <Bar dataKey="pago" name="Pago" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="aprovisionado" name="Aprovisionado" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="saldo" name="Saldo" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="py-3 px-4 font-bold text-slate-700">Item / Categoria</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">Orçado</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">Pago</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">Aprovisionado</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">Saldo</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">Execução</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-medium text-slate-800">{item.nome} <span className="block text-[10px] text-slate-400">{item.grupo}</span></td>
                      <td className="py-2 px-4 text-right">{fmt(item.orcado)}</td>
                      <td className="py-2 px-4 text-right text-green-600">{fmt(item.pago)}</td>
                      <td className="py-2 px-4 text-right text-amber-500">{fmt(item.aprovisionado)}</td>
                      <td className={`py-2 px-4 text-right font-bold ${item.saldo < 0 ? 'text-red-500' : 'text-blue-600'}`}>{fmt(item.saldo)}</td>
                      <td className="py-2 px-4 text-right font-medium">{item.execucao.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {itens.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-slate-500">Nenhum dado encontrado</td></tr>}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="py-3 px-4 font-black">TOTAL</td>
                    <td className="py-3 px-4 text-right font-black">{fmt(totais.orcado)}</td>
                    <td className="py-3 px-4 text-right font-black text-green-600">{fmt(totais.pago)}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-500">{fmt(totais.aprovisionado)}</td>
                    <td className={`py-3 px-4 text-right font-black ${totais.saldo < 0 ? 'text-red-500' : 'text-blue-600'}`}>{fmt(totais.saldo)}</td>
                    <td className="py-3 px-4 text-right font-black">{totais.execucao.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}