import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, Download, AlertTriangle, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function InfoField({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-[#1a2e4a]">{value || "—"}</div>
    </div>
  );
}

export default function ContratoDetalhe() {
  const urlParams = new URLSearchParams(window.location.search);
  const contratoId = urlParams.get("id");
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const canEdit = user?.role === "admin" || user?.role === "gestor";
  const canDelete = user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: async () => {
      // Simulating the requested structure fetching all related entities manually to ensure it works with the Base44 SDK
      const [
        contratoData, itensData, aditivosData, lancamentosData, 
        postosData, contasData, reajustesData, fiscaisData, documentosData
      ] = await Promise.all([
        base44.entities.Contrato.get(contratoId).catch(() => null),
        base44.entities.ItemContrato.filter({ contrato_id: contratoId }).catch(() => []),
        base44.entities.Aditivo.filter({ contrato_id: contratoId }).catch(() => []),
        base44.entities.LancamentoFinanceiro.filter({ contrato_id: contratoId }).catch(() => []),
        base44.entities.PostoTrabalho.filter({ contrato_id: contratoId }).catch(() => []),
        base44.entities.ContaVinculada.filter({ contrato_id: contratoId }).catch(() => []),
        base44.entities.Reajuste ? base44.entities.Reajuste.filter({ contrato_id: contratoId }).catch(() => []) : Promise.resolve([]),
        base44.entities.FiscalPortaria ? base44.entities.FiscalPortaria.filter({ contrato_id: contratoId }).catch(() => []) : Promise.resolve([]),
        base44.entities.DocumentoContrato ? base44.entities.DocumentoContrato.filter({ contrato_id: contratoId }).catch(() => []) : Promise.resolve([])
      ]);

      let convencaoData = null;
      if (contratoData?.convenio_coletiva_id) {
        convencaoData = await base44.entities.ConvencaoColetiva.get(contratoData.convenio_coletiva_id).catch(() => null);
      }

      return {
        contrato: contratoData,
        itens: itensData,
        aditivos: aditivosData,
        lancamentos: lancamentosData,
        postos: postosData,
        contas: contasData,
        reajustes: reajustesData,
        convencao: convencaoData,
        fiscais: fiscaisData,
        alertas: [], // Mocks for entities that might be created later
        documentos: documentosData,
        historico: []
      };
    },
    enabled: !!contratoId
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Carregando detalhes do contrato...</div>;
  if (!data?.contrato) return <div className="p-8 text-center text-gray-400">Contrato não encontrado</div>;

  const { contrato, itens, aditivos, lancamentos, postos, contas, reajustes, convencao, fiscais, alertas, documentos, historico } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Contratos")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1a2e4a]">Contrato {contrato.numero}</h1>
            <Badge variant="outline" className="uppercase">{contrato.status}</Badge>
          </div>
          <p className="text-sm text-gray-500">{contrato.contratada}</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent justify-start">
          <TabsTrigger value="geral" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Informações Gerais</TabsTrigger>
          <TabsTrigger value="fiscais" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Equipe de Fiscalização</TabsTrigger>
          <TabsTrigger value="itens" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Itens do Contrato</TabsTrigger>
          <TabsTrigger value="saldos" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Valores e Saldos</TabsTrigger>
          <TabsTrigger value="bdis" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">BDIs e Descontos</TabsTrigger>
          <TabsTrigger value="convencao" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Convenção Coletiva</TabsTrigger>
          <TabsTrigger value="conta" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Conta Vinculada</TabsTrigger>
          <TabsTrigger value="reajustes" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Reajustes/Repactuações</TabsTrigger>
          <TabsTrigger value="alertas" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Alertas/Avisos</TabsTrigger>
          <TabsTrigger value="aditivos" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Aditivos</TabsTrigger>
          <TabsTrigger value="lancamentos" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Lançamentos</TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Documentos</TabsTrigger>
          <TabsTrigger value="auditoria" className="data-[state=active]:bg-[#1a2e4a] data-[state=active]:text-white">Auditoria</TabsTrigger>
        </TabsList>

        {/* ABA 1 - INFORMAÇÕES GERAIS */}
        <TabsContent value="geral" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Dados do Contrato</CardTitle>
              <div className="flex gap-2">
                {canEdit && <Button size="sm" variant="outline"><Pencil className="w-4 h-4 mr-2"/> Editar</Button>}
                {canDelete && <Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Deletar</Button>}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <InfoField label="Número" value={contrato.numero} />
                <InfoField label="Objeto" value={contrato.objeto} />
                <InfoField label="Escopo Resumido" value={contrato.escopo_resumido} />
                <InfoField label="Status" value={contrato.status} />
              </div>
              <div className="space-y-4">
                <InfoField label="Contratada" value={contrato.contratada} />
                <InfoField label="CNPJ" value={contrato.cnpj} />
                <InfoField label="Processo SEI" value={contrato.processo_sei} />
              </div>
              <div className="space-y-4">
                <InfoField label="Data Início" value={contrato.data_inicio ? format(new Date(contrato.data_inicio), 'dd/MM/yyyy') : ''} />
                <InfoField label="Data Fim" value={contrato.data_fim ? format(new Date(contrato.data_fim), 'dd/MM/yyyy') : ''} />
                <InfoField label="Prazo Vigência (meses)" value={contrato.prazo_vigencia_inicial_meses} />
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Valores Limite</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoField label="Valor Global" value={fmt(contrato.valor_global)} />
                <InfoField label="Limite Orçamento" value={fmt(contrato.limite_orcamento)} />
                <InfoField label="Limite Financeiro" value={fmt(contrato.limite_financeiro)} />
                <InfoField label="Limite Empenho" value={fmt(contrato.limite_empenho)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Gestão e Portaria</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <InfoField label="Gestor do Contrato" value={contrato.gestor_nome} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA EQUIPE DE FISCALIZAÇÃO */}
        <TabsContent value="fiscais" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Equipe de Fiscalização e Gestão</CardTitle>
              {canEdit && <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2"/> Adicionar Fiscal</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Designação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fiscais.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-4">Nenhum fiscal designado na portaria.</TableCell></TableRow> : 
                    fiscais.sort((a, b) => a.tipo.localeCompare(b.tipo)).map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell>{f.matricula}</TableCell>
                        <TableCell>
                          <div className="text-sm">{f.email}</div>
                          {f.telefone && <div className="text-xs text-gray-500">{f.telefone}</div>}
                        </TableCell>
                        <TableCell>{f.cargo}</TableCell>
                        <TableCell><Badge className="capitalize" variant="outline">{f.tipo}</Badge></TableCell>
                        <TableCell>{f.data_designacao ? format(new Date(f.data_designacao), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4"/></Button>
                          {canDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4"/></Button>}
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2 - ITENS DO CONTRATO */}
        <TabsContent value="itens" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Itens Contratados</CardTitle>
              {canEdit && <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Adicionar Item</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome/Descrição</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">V. Unitário</TableHead>
                    <TableHead className="text-right">V. Total Contratado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-4">Nenhum item.</TableCell></TableRow> : 
                    itens.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-xs text-gray-500">{item.descricao}</div>
                        </TableCell>
                        <TableCell>{item.grupo_servico}</TableCell>
                        <TableCell>{item.quantidade_contratada}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell className="text-right">{fmt(item.valor_unitario)}</TableCell>
                        <TableCell className="text-right">{fmt(item.valor_total_contratado)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3 - VALORES E SALDOS */}
        <TabsContent value="saldos" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Acompanhamento de Saldos por Item</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">V. Contratado</TableHead>
                    <TableHead className="text-right">V. Pago</TableHead>
                    <TableHead className="text-right">Saldo Restante</TableHead>
                    <TableHead className="text-center">% Execução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-right">{fmt(item.valor_total_contratado)}</TableCell>
                      <TableCell className="text-right text-blue-600">{fmt(item.valor_pago)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(item.saldo)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.percentual_execucao?.toFixed(1) || 0}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4 - BDIs E DESCONTOS */}
        <TabsContent value="bdis" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Taxas e Descontos Aplicados</CardTitle>
              {canDelete && <Button size="sm" variant="outline"><Pencil className="w-4 h-4 mr-2"/> Editar Taxas</Button>}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-50"><CardContent className="p-4 text-center"><div className="text-sm text-gray-500 mb-1">BDI Normal</div><div className="text-2xl font-bold text-[#1a2e4a]">{contrato.bdi_normal || 0}%</div></CardContent></Card>
              <Card className="bg-slate-50"><CardContent className="p-4 text-center"><div className="text-sm text-gray-500 mb-1">BDI Diferenciado</div><div className="text-2xl font-bold text-[#1a2e4a]">{contrato.bdi_diferenciado || 0}%</div></CardContent></Card>
              <Card className="bg-slate-50"><CardContent className="p-4 text-center"><div className="text-sm text-gray-500 mb-1">Desconto Licitação</div><div className="text-2xl font-bold text-[#1a2e4a]">{contrato.desconto_licitacao || 0}%</div></CardContent></Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5 - CONVENÇÃO COLETIVA */}
        <TabsContent value="convencao" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Convenção Coletiva de Trabalho (ACT/CCT)</CardTitle></CardHeader>
            <CardContent>
              {convencao ? (
                <div className="space-y-6">
                  {differenceInDays(new Date(convencao.data_vigencia_fim), new Date()) <= 30 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <div>
                        <h4 className="font-bold">Atenção: Convenção Coletiva Vencendo</h4>
                        <p className="text-sm">A convenção expira em breve. O novo ACT já foi aprovado/homologado?</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <InfoField label="Número" value={convencao.numero} />
                    <InfoField label="Sindicato" value={convencao.sindicato} />
                    <InfoField label="Categoria" value={convencao.categoria} />
                    <InfoField label="Status" value={<Badge>{convencao.status}</Badge>} />
                    <InfoField label="Data Base" value={convencao.data_base ? format(new Date(convencao.data_base), 'dd/MM/yyyy') : ''} />
                    <InfoField label="Início Vigência" value={convencao.data_vigencia_inicio ? format(new Date(convencao.data_vigencia_inicio), 'dd/MM/yyyy') : ''} />
                    <InfoField label="Fim Vigência" value={convencao.data_vigencia_fim ? format(new Date(convencao.data_vigencia_fim), 'dd/MM/yyyy') : ''} />
                    <InfoField label="Reajuste Acordado" value={`${convencao.percentual_reajuste || 0}%`} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Nenhuma convenção coletiva vinculada.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6 - CONTA VINCULADA */}
        <TabsContent value="conta" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Retenções (Conta Vinculada)</CardTitle>
              {canEdit && <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Gerar Conta Vinculada</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco/Agência/Conta</TableHead>
                    <TableHead className="text-right">Férias</TableHead>
                    <TableHead className="text-right">13º Salário</TableHead>
                    <TableHead className="text-right">FGTS/Multa</TableHead>
                    <TableHead className="text-right">Encargos</TableHead>
                    <TableHead className="text-right font-bold">Saldo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4">Nenhuma retenção gerada.</TableCell></TableRow> : 
                    contas.map(cc => (
                      <TableRow key={cc.id}>
                        <TableCell className="font-medium">{cc.banco} - Ag {cc.agencia} / CC {cc.conta}</TableCell>
                        <TableCell className="text-right">{fmt(cc.saldo_ferias)}</TableCell>
                        <TableCell className="text-right">{fmt(cc.saldo_13_salario)}</TableCell>
                        <TableCell className="text-right">{fmt(cc.saldo_fgts)}</TableCell>
                        <TableCell className="text-right">{fmt(cc.saldo_encargos)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-700">{fmt(cc.saldo_total)}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 7 - REAJUSTES E REPACTUAÇÕES */}
        <TabsContent value="reajustes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Reajustes e Repactuações</CardTitle>
              {canEdit && <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Criar Reajuste</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Índice/Percentual</TableHead>
                    <TableHead className="text-right">V. Anterior</TableHead>
                    <TableHead className="text-right">Novo Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reajustes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4">Nenhum reajuste.</TableCell></TableRow> : 
                    reajustes.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.data_reajuste), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="capitalize">{r.tipo}</TableCell>
                        <TableCell>{r.percentual_reajuste}%</TableCell>
                        <TableCell className="text-right">{fmt(r.valor_anterior)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(r.novo_valor)}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 8 - ALERTAS/AVISOS */}
        <TabsContent value="alertas" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Alertas e Pendências</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Nenhum alerta ativo para este contrato.</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 9 - ADITIVOS */}
        <TabsContent value="aditivos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Termos Aditivos</CardTitle>
              {canEdit && <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Criar Aditivo</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número/Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Novo Prazo/Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aditivos.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4">Nenhum aditivo.</TableCell></TableRow> : 
                    aditivos.map(ad => (
                      <TableRow key={ad.id}>
                        <TableCell>
                          <div className="font-bold">{ad.numero_aditivo || 'S/N'}</div>
                          <Badge variant="secondary" className="mt-1 capitalize">{ad.tipo}</Badge>
                        </TableCell>
                        <TableCell>{ad.data_assinatura ? format(new Date(ad.data_assinatura), 'dd/MM/yyyy') : ''}</TableCell>
                        <TableCell>
                          {ad.nova_data_fim && <div>Prazo: {format(new Date(ad.nova_data_fim), 'dd/MM/yyyy')}</div>}
                          {ad.novo_valor && <div>Valor: {fmt(ad.novo_valor)}</div>}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{ad.descricao}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 10 - LANÇAMENTOS FINANCEIROS */}
        <TabsContent value="lancamentos" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Lançamentos Financeiros e Notas Fiscais</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum lançamento.</TableCell></TableRow> : 
                    lancamentos.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM/yyyy') : ''}</TableCell>
                        <TableCell>Mês {l.mes}/{l.ano} {l.numero_nf ? `- NF ${l.numero_nf}` : ''}</TableCell>
                        <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{fmt(l.valor_pago_final || l.valor)}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 11 - DOCUMENTOS */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Arquivos e Documentos</CardTitle>
              {canEdit && <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Fazer Upload</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data de Upload</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum documento anexado ao contrato.</TableCell></TableRow> : 
                    documentos.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="font-medium text-[#1a2e4a] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            {doc.nome_arquivo}
                          </div>
                        </TableCell>
                        <TableCell><Badge className="uppercase" variant="outline">{doc.tipo}</Badge></TableCell>
                        <TableCell className="text-gray-500 text-sm">{(doc.tamanho_arquivo / 1024 / 1024).toFixed(2)} MB</TableCell>
                        <TableCell>{format(new Date(doc.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="text-right">
                          {doc.url_arquivo && (
                            <a href={doc.url_arquivo} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Download className="w-4 h-4"/></Button>
                            </a>
                          )}
                          {canDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4"/></Button>}
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 12 - AUDITORIA */}
        <TabsContent value="auditoria" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Histórico de Alterações</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Nenhum registro de auditoria encontrado.</div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}