import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import ItemForm from "@/components/contratos/ItemForm.jsx";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ContratoDetalhe() {
  const urlParams = new URLSearchParams(window.location.search);
  const contratoId = urlParams.get("id");

  const [contrato, setContrato] = useState(null);
  const [itens, setItens] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (contratoId) loadAll();
  }, [contratoId]);

  const loadAll = async () => {
    const [c, i, l] = await Promise.all([
      base44.entities.Contrato.filter({ id: contratoId }),
      base44.entities.ItemContrato.filter({ contrato_id: contratoId }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contratoId })
    ]);
    setContrato(c[0]);
    setItens(i);
    setLancamentos(l);
    setLoading(false);
  };

  const handleDeleteItem = async (id) => {
    if (!confirm("Excluir este item?")) return;
    await base44.entities.ItemContrato.delete(id);
    loadAll();
  };

  const canEdit = user?.role === "admin" || user?.role === "gestor" || user?.role === "fiscal";

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!contrato) return <div className="p-8 text-center text-gray-400">Contrato não encontrado</div>;

  const totalPago = lancamentos.filter(l => l.tipo === "pagamento" && l.status === "pago").reduce((s, l) => s + l.valor, 0);
  const totalProvisao = lancamentos.filter(l => l.tipo === "provisao").reduce((s, l) => s + l.valor, 0);
  const totalEmpenho = lancamentos.filter(l => l.tipo === "empenho").reduce((s, l) => s + l.valor, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Contratos")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1a2e4a]">{contrato.numero}</h1>
            <Badge variant="outline" className="text-xs capitalize">{contrato.status}</Badge>
          </div>
          <div className="text-sm text-gray-500">{contrato.contratada}</div>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Valor Global", value: fmt(contrato.valor_global), color: "border-l-blue-500" },
          { label: "Total Pago", value: fmt(totalPago), color: "border-l-green-500" },
          { label: "Provisionado", value: fmt(totalProvisao), color: "border-l-amber-500" },
          { label: "Empenhado", value: fmt(totalEmpenho), color: "border-l-purple-500" }
        ].map(s => (
          <Card key={s.label} className={`border-l-4 ${s.color}`}>
            <CardContent className="p-3">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="font-bold text-[#1a2e4a] text-sm mt-0.5">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="itens">
        <TabsList>
          <TabsTrigger value="itens">Itens do Contrato</TabsTrigger>
          <TabsTrigger value="info">Informações Gerais</TabsTrigger>
        </TabsList>

        <TabsContent value="itens" className="space-y-4 mt-4">
          {(showItemForm || editingItem) ? (
            <ItemForm
              item={editingItem}
              contratoId={contratoId}
              onSave={() => { setShowItemForm(false); setEditingItem(null); loadAll(); }}
              onCancel={() => { setShowItemForm(false); setEditingItem(null); }}
            />
          ) : (
            <>
              {canEdit && (
                <Button onClick={() => setShowItemForm(true)} size="sm" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
                  <Plus className="w-4 h-4 mr-1" /> Novo Item
                </Button>
              )}
              {itens.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum item cadastrado</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-500">Nome</th>
                        <th className="text-left p-3 font-medium text-gray-500">Unidade</th>
                        <th className="text-left p-3 font-medium text-gray-500">Periodicidade</th>
                        <th className="text-right p-3 font-medium text-gray-500">Qtd</th>
                        <th className="text-right p-3 font-medium text-gray-500">Valor Unit.</th>
                        <th className="text-right p-3 font-medium text-gray-500">Total Contratado</th>
                        {canEdit && <th className="p-3"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map(item => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium text-[#1a2e4a]">{item.nome}</td>
                          <td className="p-3 text-gray-600">{item.unidade || "—"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs capitalize">{item.periodicidade}</Badge>
                          </td>
                          <td className="p-3 text-right">{item.quantidade_contratada || "—"}</td>
                          <td className="p-3 text-right">{fmt(item.valor_unitario)}</td>
                          <td className="p-3 text-right font-semibold">{fmt(item.valor_total_contratado || (item.valor_unitario * (item.quantidade_contratada || 1)))}</td>
                          {canEdit && (
                            <td className="p-3">
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingItem(item)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400" onClick={() => handleDeleteItem(item.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Número", value: contrato.numero },
                { label: "Processo SEI", value: contrato.processo_sei },
                { label: "Contratada", value: contrato.contratada },
                { label: "CNPJ", value: contrato.cnpj },
                { label: "Valor Global", value: fmt(contrato.valor_global) },
                { label: "Status", value: contrato.status },
                { label: "Início", value: contrato.data_inicio ? format(new Date(contrato.data_inicio), "dd/MM/yyyy") : "—" },
                { label: "Término", value: contrato.data_fim ? format(new Date(contrato.data_fim), "dd/MM/yyyy") : "—" },
                { label: "Email do Fiscal", value: contrato.fiscal_email },
                { label: "Email do Gestor", value: contrato.gestor_email }
              ].map(f => (
                <div key={f.label}>
                  <div className="text-xs text-gray-400 font-medium">{f.label}</div>
                  <div className="mt-0.5 font-medium text-[#1a2e4a]">{f.value || "—"}</div>
                </div>
              ))}
              {contrato.observacoes && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-gray-400 font-medium">Observações</div>
                  <div className="mt-0.5 text-gray-700">{contrato.observacoes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}