import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const fmtCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Contratos() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({
    status: "todos",
    dataInicio: "",
    dataFim: "",
    busca: "",
    valorMin: "",
    valorMax: "",
    bdi: "todos"
  });

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const canEdit = user?.role === "admin" || user?.role === "gestor";
  const canDelete = user?.role === "admin";

  const { data: contratos = [], isLoading, refetch } = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      return await base44.entities.Contrato.list("-created_date");
    }
  });

  const { data: itensContrato = [] } = useQuery({
    queryKey: ['itemContratos'],
    queryFn: () => base44.entities.ItemContrato.list()
  });

  const contratosWithValues = contratos.map(c => {
    const itens = itensContrato.filter(i => i.contrato_id === c.id);
    const valorPago = itens.reduce((acc, curr) => acc + (curr.valor_pago || 0), 0);
    const saldo = (c.valor_global || 0) - valorPago;
    return { ...c, valor_pago: valorPago, saldo };
  });

  const filtered = contratosWithValues.filter(c => {
    if (filtros.status !== "todos" && c.status !== filtros.status) return false;
    if (filtros.dataInicio && c.data_inicio < filtros.dataInicio) return false;
    if (filtros.dataFim && c.data_fim > filtros.dataFim) return false;
    
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      const matchNumero = c.numero?.toLowerCase().includes(termo);
      const matchObjeto = c.objeto?.toLowerCase().includes(termo);
      const matchContratada = c.contratada?.toLowerCase().includes(termo);
      if (!matchNumero && !matchObjeto && !matchContratada) return false;
    }

    if (filtros.valorMin && c.valor_global < Number(filtros.valorMin)) return false;
    if (filtros.valorMax && c.valor_global > Number(filtros.valorMax)) return false;
    if (filtros.bdi !== "todos") {
       if (filtros.bdi === "normal" && !c.bdi_normal) return false;
       if (filtros.bdi === "diferenciado" && !c.bdi_diferenciado) return false;
    }
    return true;
  });

  const PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // KPIs
  const totalAtivos = contratosWithValues.filter(c => c.status === 'ativo').length;
  const totalVencidos = contratosWithValues.filter(c => c.status === 'encerrado' || (c.data_fim && new Date(c.data_fim) < new Date())).length;
  const proximosVencimento = contratosWithValues.filter(c => {
    if (c.status !== 'ativo' || !c.data_fim) return false;
    const days = differenceInDays(new Date(c.data_fim), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const valorTotalContratado = contratosWithValues.reduce((acc, c) => acc + (c.valor_global || 0), 0);
  const valorTotalPago = contratosWithValues.reduce((acc, c) => acc + (c.valor_pago || 0), 0);
  const saldoTotal = valorTotalContratado - valorTotalPago;

  const handleDelete = async (id) => {
    if (!confirm("Deseja excluir este contrato?")) return;
    await base44.entities.Contrato.delete(id);
    refetch();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1a2e4a]">Contratos</h1>
        {canEdit && (
          <Button onClick={() => navigate(createPageUrl('NovoContrato'))} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
            <Plus className="w-4 h-4 mr-2" /> Novo Contrato
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Total Ativos</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-bold text-green-600">{totalAtivos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Total Vencidos</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-bold text-red-600">{totalVencidos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Vencendo (30d)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-bold text-amber-500">{proximosVencimento}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">V. Total Contratado</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-lg font-bold text-[#1a2e4a]">{fmtCurrency(valorTotalContratado)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">V. Total Pago</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-lg font-bold text-blue-600">{fmtCurrency(valorTotalPago)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Saldo Total</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-lg font-bold text-green-600">{fmtCurrency(saldoTotal)}</CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Select value={filtros.status} onValueChange={v => setFiltros({ ...filtros, status: v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={filtros.dataInicio} onChange={e => setFiltros({ ...filtros, dataInicio: e.target.value })} placeholder="Data Início" />
          <Input type="date" value={filtros.dataFim} onChange={e => setFiltros({ ...filtros, dataFim: e.target.value })} placeholder="Data Fim" />
          <Input placeholder="Buscar por número, objeto ou contratada..." value={filtros.busca} onChange={e => setFiltros({ ...filtros, busca: e.target.value })} />
          <div className="flex gap-2">
            <Input type="number" placeholder="V. Min" value={filtros.valorMin} onChange={e => setFiltros({ ...filtros, valorMin: e.target.value })} />
            <Input type="number" placeholder="V. Max" value={filtros.valorMax} onChange={e => setFiltros({ ...filtros, valorMax: e.target.value })} />
          </div>
          <Select value={filtros.bdi} onValueChange={v => setFiltros({ ...filtros, bdi: v })}>
            <SelectTrigger><SelectValue placeholder="BDI" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos BDI</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="diferenciado">Diferenciado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Objeto</TableHead>
                <TableHead>Contratada</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">V. Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Nenhum contrato encontrado.</TableCell></TableRow>
              ) : (
                paginated.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(createPageUrl(`ContratoDetalhe?id=${c.id}`))}>
                    <TableCell className="font-medium text-[#1a2e4a]">{c.numero}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={c.objeto}>{c.objeto}</TableCell>
                    <TableCell>{c.contratada}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {c.data_inicio ? format(new Date(c.data_inicio), 'dd/MM/yyyy') : '-'} a <br/>
                      {c.data_fim ? format(new Date(c.data_fim), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        c.status === 'ativo' ? 'text-green-600 bg-green-50' : 
                        c.status === 'encerrado' ? 'text-gray-600 bg-gray-50' : 
                        'text-amber-600 bg-amber-50'
                      }>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmtCurrency(c.valor_global)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-green-600">{fmtCurrency(c.saldo)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate(createPageUrl(`ContratoDetalhe?id=${c.id}`))}>
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate(createPageUrl(`NovoContrato?id=${c.id}`))}>
                            <Pencil className="w-4 h-4 text-amber-600" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-100" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}