import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calcularProRata } from '@/utils/calculos';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const AbaValoresSaldos = ({ contrato, itens_iniciais }) => {
  const [valores, setValores] = useState(null);
  const [itens, setItens] = useState(itens_iniciais || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        let itensData = itens_iniciais;
        // Buscar itens do contrato se não vieram das props
        if (!itensData || itensData.length === 0) {
            itensData = await base44.entities.ItemContrato.filter({ contrato_id: contrato.id });
        }
        
        setItens(itensData);

        // Calcular pró-rata
        const prorrata = calcularProRata(
          new Date(contrato.data_inicio),
          new Date(contrato.data_fim),
          contrato.valor_global || 0,
          1
        );

        // Calcular totais
        const totalContratado = itensData.reduce((sum, item) => sum + (item.valor_total_contratado || 0), 0);
        const totalPago = itensData.reduce((sum, item) => sum + (item.valor_pago || 0), 0);
        const saldoTotal = totalContratado - totalPago;
        const percentualExecucao = totalContratado > 0 ? (totalPago / totalContratado) * 100 : 0;

        setValores({
          valor_global: contrato.valor_global || 0,
          valor_prorrata: prorrata?.valor_prorrata || 0,
          total_contratado: totalContratado,
          total_pago: totalPago,
          saldo_total: saldoTotal,
          percentual_execucao: percentualExecucao.toFixed(2),
          limite_orcamento: contrato.limite_orcamento,
          limite_financeiro: contrato.limite_financeiro,
          limite_empenho: contrato.limite_empenho
        });
      } catch (error) {
        console.error('Erro ao carregar valores:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [contrato, itens_iniciais]);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando saldos e valores...</div>;
  if (!valores) return <div className="p-8 text-center text-red-500">Erro ao carregar valores</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valor Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a2e4a]">{fmt(valores.valor_global)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pró-Rata (1º Ano)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a2e4a]">{fmt(valores.valor_prorrata)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Contratado (Itens)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a2e4a]">{fmt(valores.total_contratado)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmt(valores.total_pago)}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Saldo Restante</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{fmt(valores.saldo_total)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">% Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a2e4a]">{valores.percentual_execucao}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">Limites Orçamentários e Financeiros</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Limite Orçamento</span>
              <span className="font-semibold text-base">{valores.limite_orcamento ? fmt(valores.limite_orcamento) : 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Limite Financeiro</span>
              <span className="font-semibold text-base">{valores.limite_financeiro ? fmt(valores.limite_financeiro) : 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Limite Empenho</span>
              <span className="font-semibold text-base">{valores.limite_empenho ? fmt(valores.limite_empenho) : 'N/A'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">Acompanhamento de Saldos por Item</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6">Item</TableHead>
                <TableHead className="text-right">V. Contratado</TableHead>
                <TableHead className="text-right">V. Pago</TableHead>
                <TableHead className="text-right">Saldo Restante</TableHead>
                <TableHead className="text-center pr-6">% Execução</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">Nenhum item cadastrado.</TableCell></TableRow> : (() => {
                const NOME_MAP = {
                  "SERVIÇOS DE DESLOCAMENTO CORRETIVO": "Deslocamento corretivo",
                  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO": "Deslocamento Preventivo",
                  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO": "Deslocamento do engenheiro",
                  "SERVIÇOS EVENTUAIS": "Serviços Eventuais",
                  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS": "Locações",
                  "FORNECIMENTO DE MATERIAL": "Fornecimento de Materiais",
                  "Fornecimento de Material": "Fornecimento de Materiais",
                  "FORNECIMENTO DE MATERIAIS": "Fornecimento de Materiais"
                };

                const mapName = (nome) => NOME_MAP[nome] || nome;

                const GRUPOS = [
                  {
                    titulo: "Serviços Fixos",
                    cor: "text-blue-700",
                    bg: "bg-blue-50",
                    itensOriginais: ["MOR Natal", "MOR Mossoró", "SERVIÇOS DE DESLOCAMENTO PREVENTIVO"],
                  },
                  {
                    titulo: "Demandas Eventuais",
                    cor: "text-amber-700",
                    bg: "bg-amber-50",
                    itensOriginais: [
                      "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
                      "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
                      "SERVIÇOS EVENTUAIS",
                      "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
                      "FORNECIMENTO DE MATERIAIS",
                      "Fornecimento de Material",
                      "FORNECIMENTO DE MATERIAL",
                    ],
                  },
                ];

                const itensAgrupados = GRUPOS.map(g => {
                  const rows = itens.filter(i => g.itensOriginais.includes(i.nome));
                  return { ...g, rows };
                }).filter(g => g.rows.length > 0);

                const itensNoGrupo = new Set(GRUPOS.flatMap(g => g.itensOriginais));
                const itensSemGrupo = itens.filter(i => !itensNoGrupo.has(i.nome));

                return (
                  <>
                    {itensAgrupados.map((g, gi) => (
                      <React.Fragment key={`group-${gi}`}>
                        <tr className={`${g.bg} border-b border-gray-100`}>
                          <td colSpan={5} className={`py-1.5 pl-6 font-bold ${g.cor} uppercase tracking-wider text-xs`}>
                            {g.titulo}
                          </td>
                        </tr>
                        {g.rows.map(item => (
                          <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <TableCell className="font-medium pl-10 text-xs">{mapName(item.nome)}</TableCell>
                            <TableCell className="text-right text-xs">{fmt(item.valor_total_contratado)}</TableCell>
                            <TableCell className="text-right text-green-600 font-semibold text-xs">{fmt(item.valor_pago)}</TableCell>
                            <TableCell className="text-right text-blue-600 font-semibold text-xs">{fmt(item.saldo)}</TableCell>
                            <TableCell className="text-center pr-6">
                              <Badge variant="outline" className="bg-slate-50 text-[10px]">{item.percentual_execucao?.toFixed(1) || 0}%</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                    {itensSemGrupo.length > 0 && (
                      <>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <td colSpan={5} className="py-1.5 pl-6 font-bold text-gray-600 uppercase tracking-wider text-xs">
                            Outros Itens
                          </td>
                        </tr>
                        {itensSemGrupo.map(item => (
                          <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <TableCell className="font-medium pl-10 text-xs">{mapName(item.nome)}</TableCell>
                            <TableCell className="text-right text-xs">{fmt(item.valor_total_contratado)}</TableCell>
                            <TableCell className="text-right text-green-600 font-semibold text-xs">{fmt(item.valor_pago)}</TableCell>
                            <TableCell className="text-right text-blue-600 font-semibold text-xs">{fmt(item.saldo)}</TableCell>
                            <TableCell className="text-center pr-6">
                              <Badge variant="outline" className="bg-slate-50 text-[10px]">{item.percentual_execucao?.toFixed(1) || 0}%</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};