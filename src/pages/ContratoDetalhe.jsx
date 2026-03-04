import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { format, differenceInMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ItemForm from "@/components/contratos/ItemForm.jsx";
import AditivoForm from "@/components/contratos/AditivoForm.jsx";
import ItensAgrupados from "@/components/contratos/ItensAgrupados.jsx";
import EmpenhoForm from "@/components/contratos/EmpenhoForm.jsx";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const NATUREZA_LABELS = {
  "339039_servico": "339039 – Serviços (Manutenção)",
  "339030_material": "339030 – Material de Consumo"
};

const tipoAditivoLabels = {
  tempo: "Prorrogação de Prazo",
  repactuacao: "Repactuação",
  reajuste: "Reajuste de Valor",
  inclusao_itens: "Inclusão de Itens",
  exclusao_itens: "Exclusão de Itens",
  outro: "Outro"
};

const tipoAditivoColors = {
  tempo: "bg-blue-50 text-blue-700 border-blue-200",
  repactuacao: "bg-purple-50 text-purple-700 border-purple-200",
  reajuste: "bg-amber-50 text-amber-700 border-amber-200",
  inclusao_itens: "bg-green-50 text-green-700 border-green-200",
  exclusao_itens: "bg-red-50 text-red-700 border-red-200",
  outro: "bg-gray-50 text-gray-700 border-gray-200"
};

function InfoField({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      <div className="mt-0.5 font-medium text-[#1a2e4a]">{value}</div>
    </div>
  );
}

export default function ContratoDetalhe() {
  const urlParams = new URLSearchParams(window.location.search);
  const contratoId = urlParams.get("id");

  const [contrato, setContrato] = useState(null);
  const [itens, setItens] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [aditivos, setAditivos] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAditivoForm, setShowAditivoForm] = useState(false);
  const [editingAditivo, setEditingAditivo] = useState(null);
  const [showEmpenhoForm, setShowEmpenhoForm] = useState(false);
  const [editingEmpenho, setEditingEmpenho] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (contratoId) loadAll();
  }, [contratoId]);

  const loadAll = async () => {
    const [c, i, l, a] = await Promise.all([
      base44.entities.Contrato.filter({ id: contratoId }),
      base44.entities.ItemContrato.filter({ contrato_id: contratoId }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contratoId }),
      base44.entities.Aditivo.filter({ contrato_id: contratoId })
    ]);
    setContrato(c[0]);
    setItens(i);
    setLancamentos(l);
    setAditivos(a.sort((x, y) => new Date(x.data_assinatura) - new Date(y.data_assinatura)));
    setLoading(false);
  };

  const handleDeleteItem = async (id) => {
    if (!confirm("Excluir este item?")) return;
    await base44.entities.ItemContrato.delete(id);
    loadAll();
  };

  const handleDeleteAditivo = async (id) => {
    if (!confirm("Excluir este aditivo?")) return;
    await base44.entities.Aditivo.delete(id);
    loadAll();
  };

  const canEdit = user?.role === "admin" || user?.role === "gestor" || user?.role === "fiscal";

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!contrato) return <div className="p-8 text-center text-gray-400">Contrato não encontrado</div>;

  const totalPago = lancamentos.filter(l => l.tipo === "pagamento" && l.status === "pago").reduce((s, l) => s + l.valor, 0);
  const totalProvisao = lancamentos.filter(l => l.tipo === "provisao").reduce((s, l) => s + l.valor, 0);
  const totalEmpenho = lancamentos.filter(l => l.tipo === "empenho").reduce((s, l) => s + l.valor, 0);

  // Cálculo de vigência
  const hoje = new Date();
  const dataFim = contrato.data_fim ? parseISO(contrato.data_fim) : null;
  const dataInicio = contrato.data_inicio ? parseISO(contrato.data_inicio) : null;
  const mesesDecorridos = dataInicio ? differenceInMonths(hoje, dataInicio) : 0;
  const mesesRestantes = dataFim ? differenceInMonths(dataFim, hoje) : null;
  const mesesTotaisUsados = dataInicio && dataFim ? differenceInMonths(dataFim, dataInicio) : 0;
  const tempoMaximo = contrato.tempo_maximo_contrato_meses;
  const percentualTempoUsado = tempoMaximo ? Math.min(100, Math.round((mesesTotaisUsados / tempoMaximo) * 100)) : null;
  const alertaLimite = tempoMaximo && mesesTotaisUsados >= tempoMaximo * 0.8;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Contratos")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#1a2e4a]">{contrato.numero}</h1>
            <Badge variant="outline" className="text-xs capitalize">{contrato.status}</Badge>
            {alertaLimite && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" /> Próximo do limite
              </Badge>
            )}
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="itens">Itens do Contrato</TabsTrigger>
          <TabsTrigger value="aditivos">
            Aditivos {aditivos.length > 0 && <span className="ml-1 bg-[#1a2e4a] text-white text-xs rounded-full px-1.5">{aditivos.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="fiscalizacao">Fiscalização</TabsTrigger>
          <TabsTrigger value="vigencia">Vigência</TabsTrigger>
          <TabsTrigger value="info">Informações Gerais</TabsTrigger>
        </TabsList>

        {/* ABA: ITENS */}
        <TabsContent value="itens" className="space-y-4 mt-4">
          {(showItemForm || editingItem) ? (
            <ItemForm
              item={editingItem}
              contratoId={contratoId}
              prazoVigenciaMeses={contrato.prazo_vigencia_inicial_meses}
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
                <ItensAgrupados itens={itens} canEdit={canEdit} onEdit={setEditingItem} onDelete={handleDeleteItem} />
              )}
            </>
          )}
        </TabsContent>

        {/* ABA: ADITIVOS */}
        <TabsContent value="aditivos" className="space-y-4 mt-4">
          {(showAditivoForm || editingAditivo) ? (
            <AditivoForm
              contratoId={contratoId}
              aditivo={editingAditivo}
              valorAtual={contrato.valor_global}
              onSave={() => { setShowAditivoForm(false); setEditingAditivo(null); loadAll(); }}
              onCancel={() => { setShowAditivoForm(false); setEditingAditivo(null); }}
            />
          ) : (
            <>
              {canEdit && (
                <Button onClick={() => setShowAditivoForm(true)} size="sm" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
                  <Plus className="w-4 h-4 mr-1" /> Registrar Aditivo
                </Button>
              )}
              {aditivos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum aditivo registrado</div>
              ) : (
                <div className="space-y-3">
                  {aditivos.map((ad, idx) => (
                    <Card key={ad.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold text-[#1a2e4a] text-sm">{ad.numero_aditivo || `${idx + 1}º Aditivo`}</span>
                              <Badge variant="outline" className={`text-xs ${tipoAditivoColors[ad.tipo]}`}>
                                {tipoAditivoLabels[ad.tipo]}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {ad.data_assinatura ? format(parseISO(ad.data_assinatura), "dd/MM/yyyy") : "—"}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              {ad.nova_data_fim && (
                                <div>
                                  <span className="text-xs text-gray-400">Nova data de término</span>
                                  <div className="font-medium text-[#1a2e4a]">{format(parseISO(ad.nova_data_fim), "dd/MM/yyyy")}</div>
                                </div>
                              )}
                              {ad.novo_valor && (
                                <div>
                                  <span className="text-xs text-gray-400">Novo valor global</span>
                                  <div className="font-medium text-[#1a2e4a]">{fmt(ad.novo_valor)}</div>
                                </div>
                              )}
                              {ad.percentual_reajuste && (
                                <div>
                                  <span className="text-xs text-gray-400">% Reajuste</span>
                                  <div className="font-medium text-[#1a2e4a]">{ad.percentual_reajuste}%</div>
                                </div>
                              )}
                              {ad.documento_sei && (
                                <div>
                                  <span className="text-xs text-gray-400">Documento SEI</span>
                                  <div className="font-medium text-[#1a2e4a]">{ad.documento_sei}</div>
                                </div>
                              )}
                            </div>
                            {ad.descricao && <p className="text-xs text-gray-500 mt-2">{ad.descricao}</p>}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingAditivo(ad)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400" onClick={() => handleDeleteAditivo(ad.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ABA: FISCALIZAÇÃO */}
        <TabsContent value="fiscalizacao" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-[#1a2e4a] border-b pb-1">Gestão</h3>
                <InfoField label="Gestor" value={contrato.gestor_nome} />
                <InfoField label="Matrícula" value={contrato.gestor_matricula} />
                <InfoField label="Email do Gestor" value={contrato.gestor_email} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-[#1a2e4a] border-b pb-1">Fiscal Titular</h3>
                <InfoField label="Nome" value={contrato.fiscal_titular_nome} />
                <InfoField label="Matrícula" value={contrato.fiscal_titular_matricula} />
                <InfoField label="Email" value={contrato.fiscal_email} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-[#1a2e4a] border-b pb-1">Fiscal Substituto</h3>
                <InfoField label="Nome" value={contrato.fiscal_substituto_nome} />
                <InfoField label="Matrícula" value={contrato.fiscal_substituto_matricula} />
              </CardContent>
            </Card>

            {contrato.fiscais_setoriais?.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-[#1a2e4a] border-b pb-1">Fiscais Setoriais</h3>
                  {contrato.fiscais_setoriais.map((fs, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-[#1a2e4a]">{fs.nome}</span>
                      {fs.matricula && <span className="text-gray-500"> ({fs.matricula})</span>}
                      {fs.setor && <Badge variant="outline" className="ml-2 text-xs">{fs.setor}</Badge>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Portaria */}
          {(contrato.portaria_numero || contrato.portaria_data_publicacao) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm text-[#1a2e4a] border-b pb-1 mb-3">Portaria de Fiscalização</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <InfoField label="Número da Portaria" value={contrato.portaria_numero} />
                  <InfoField label="Data de Publicação" value={contrato.portaria_data_publicacao ? format(parseISO(contrato.portaria_data_publicacao), "dd/MM/yyyy") : null} />
                  <InfoField label="Documento SEI" value={contrato.portaria_documento_sei} />
                  <InfoField label="Processo SEI (Fiscalização)" value={contrato.portaria_processo_sei} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA: VIGÊNCIA */}
        <TabsContent value="vigencia" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <InfoField label="Data de Início (1ª Vigência)" value={dataInicio ? format(dataInicio, "dd/MM/yyyy") : "—"} />
                <InfoField label="Data de Término Atual" value={dataFim ? format(dataFim, "dd/MM/yyyy") : "—"} />
                <InfoField label="Prazo da 1ª Vigência" value={contrato.prazo_vigencia_inicial_meses ? `${contrato.prazo_vigencia_inicial_meses} meses` : "—"} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <InfoField label="Meses Decorridos" value={`${mesesDecorridos} meses`} />
                <InfoField label="Meses Restantes" value={mesesRestantes !== null ? `${Math.max(0, mesesRestantes)} meses` : "—"} />
                <InfoField label="Prazo Total Atual" value={`${mesesTotaisUsados} meses`} />
              </div>

              {tempoMaximo && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Utilização do limite legal ({tempoMaximo} meses)</span>
                    <span className={`font-semibold ${alertaLimite ? "text-red-600" : "text-[#1a2e4a]"}`}>{percentualTempoUsado}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${alertaLimite ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(100, percentualTempoUsado)}%` }}
                    />
                  </div>
                  {alertaLimite && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Contrato utilizando {percentualTempoUsado}% do tempo máximo permitido.
                    </p>
                  )}
                </div>
              )}

              {aditivos.filter(a => a.tipo === "tempo").length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prorrogações realizadas</h4>
                  <div className="space-y-1">
                    {aditivos.filter(a => a.tipo === "tempo").map((ad, i) => (
                      <div key={ad.id} className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{ad.numero_aditivo || `${i + 1}º Aditivo`}</Badge>
                        <span className="text-gray-600">Nova data: <strong>{ad.nova_data_fim ? format(parseISO(ad.nova_data_fim), "dd/MM/yyyy") : "—"}</strong></span>
                        <span className="text-gray-400 text-xs">({ad.data_assinatura ? format(parseISO(ad.data_assinatura), "dd/MM/yyyy") : "—"})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: INFORMAÇÕES GERAIS */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoField label="Número do Contrato" value={contrato.numero} />
              <InfoField label="Processo SEI" value={contrato.processo_sei} />
              <InfoField label="Contratada" value={contrato.contratada} />
              <InfoField label="CNPJ" value={contrato.cnpj} />
              <InfoField label="Valor Global" value={fmt(contrato.valor_global)} />
              <InfoField label="Status" value={contrato.status} />
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