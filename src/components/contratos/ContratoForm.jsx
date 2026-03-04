import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { differenceInMonths } from "date-fns";

const emptyFiscalSetorial = () => ({ nome: "", matricula: "", setor: "" });

export default function ContratoForm({ contrato, onSave, onCancel }) {
  const [form, setForm] = useState({
    numero: contrato?.numero || "",
    objeto: contrato?.objeto || "",
    contratada: contrato?.contratada || "",
    cnpj: contrato?.cnpj || "",
    valor_global: contrato?.valor_global || "",
    valor_financeiro_disponivel_nufip: contrato?.valor_financeiro_disponivel_nufip || "",
    data_inicio: contrato?.data_inicio || "",
    data_fim: contrato?.data_fim || "",
    prazo_vigencia_inicial_meses: contrato?.prazo_vigencia_inicial_meses || "",
    tempo_maximo_contrato_meses: contrato?.tempo_maximo_contrato_meses || "",
    status: contrato?.status || "ativo",
    processo_sei: contrato?.processo_sei || "",
    gestor_nome: contrato?.gestor_nome || "",
    gestor_matricula: contrato?.gestor_matricula || "",
    fiscal_titular_nome: contrato?.fiscal_titular_nome || "",
    fiscal_titular_matricula: contrato?.fiscal_titular_matricula || "",
    fiscal_substituto_nome: contrato?.fiscal_substituto_nome || "",
    fiscal_substituto_matricula: contrato?.fiscal_substituto_matricula || "",
    fiscais_setoriais: contrato?.fiscais_setoriais || [],
    portaria_numero: contrato?.portaria_numero || "",
    portaria_data_publicacao: contrato?.portaria_data_publicacao || "",
    portaria_documento_sei: contrato?.portaria_documento_sei || "",
    portaria_processo_sei: contrato?.portaria_processo_sei || "",
    fiscal_email: contrato?.fiscal_email || "",
    gestor_email: contrato?.gestor_email || "",
    observacoes: contrato?.observacoes || ""
  });
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calcula o prazo de vigência inicial a partir das datas
  useEffect(() => {
    if (form.data_inicio && form.data_fim) {
      const meses = differenceInMonths(new Date(form.data_fim), new Date(form.data_inicio));
      if (meses > 0) set("prazo_vigencia_inicial_meses", meses);
    }
  }, [form.data_inicio, form.data_fim]);

  // Extração de dados a partir de arquivo de portaria
  const handlePortariaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtracting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          portaria_numero: { type: "string", description: "Número da portaria, ex: 332/2025" },
          portaria_data_publicacao: { type: "string", description: "Data de publicação no formato YYYY-MM-DD" },
          portaria_documento_sei: { type: "string", description: "Código verificador do documento SEI (número simples, ex: 5445202)" },
          portaria_processo_sei: { type: "string", description: "Número do processo SEI, ex: 0003480-73.2025.4.05.7100" },
          gestor_nome: { type: "string", description: "Nome completo do Gestor do contrato" },
          gestor_matricula: { type: "string", description: "Matrícula do Gestor" },
          fiscal_titular_nome: { type: "string", description: "Nome do Fiscal Técnico e Administrativo (titular)" },
          fiscal_titular_matricula: { type: "string", description: "Matrícula do fiscal titular" },
          fiscal_substituto_nome: { type: "string", description: "Nome do Fiscal Técnico e Administrativo Substituto" },
          fiscal_substituto_matricula: { type: "string", description: "Matrícula do fiscal substituto" },
          fiscais_setoriais: {
            type: "array",
            description: "Lista de todos os fiscais setoriais/técnicos nomeados, exceto titular e substituto",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                matricula: { type: "string" },
                setor: { type: "string", description: "Localidade ou setor, ex: Mossoró, Caicó" }
              }
            }
          }
        }
      }
    });
    if (result.status === "success" && result.output) {
      setForm(f => ({ ...f, ...result.output }));
    }
    setExtracting(false);
  };

  // Extração de dados a partir do arquivo do contrato
  const handleContratoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtracting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Número do contrato, ex: 12/2025 - JFRN" },
          objeto: { type: "string", description: "Objeto/descrição do contrato" },
          contratada: { type: "string", description: "Nome da empresa contratada" },
          cnpj: { type: "string", description: "CNPJ da contratada" },
          valor_global: { type: "number", description: "Valor global do contrato em reais" },
          data_inicio: { type: "string", description: "Data de início no formato YYYY-MM-DD" },
          data_fim: { type: "string", description: "Data de término no formato YYYY-MM-DD" },
          processo_sei: { type: "string", description: "Número do processo SEI" }
        }
      }
    });
    if (result.status === "success" && result.output) {
      setForm(f => ({ ...f, ...result.output }));
    }
    setExtracting(false);
  };

  const addFiscalSetorial = () => set("fiscais_setoriais", [...(form.fiscais_setoriais || []), emptyFiscalSetorial()]);
  const removeFiscalSetorial = (i) => set("fiscais_setoriais", form.fiscais_setoriais.filter((_, idx) => idx !== i));
  const updateFiscalSetorial = (i, key, val) => {
    const arr = [...(form.fiscais_setoriais || [])];
    arr[i] = { ...arr[i], [key]: val };
    set("fiscais_setoriais", arr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      valor_global: parseFloat(form.valor_global) || 0,
      valor_financeiro_disponivel_nufip: parseFloat(form.valor_financeiro_disponivel_nufip) || null,
      prazo_vigencia_inicial_meses: parseInt(form.prazo_vigencia_inicial_meses) || null,
      tempo_maximo_contrato_meses: parseInt(form.tempo_maximo_contrato_meses) || null
    };
    if (contrato?.id) {
      await base44.entities.Contrato.update(contrato.id, data);
    } else {
      await base44.entities.Contrato.create(data);
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a2e4a]">{contrato ? "Editar Contrato" : "Novo Contrato"}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Importação automática */}
        <div className="flex flex-wrap gap-3 mb-5 pb-5 border-b">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Importar dados do contrato (PDF)</p>
            <Label htmlFor="upload-contrato" className="cursor-pointer">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-gray-50 transition-colors">
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar Contrato
              </div>
              <input id="upload-contrato" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleContratoUpload} />
            </Label>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Importar dados da portaria (PDF)</p>
            <Label htmlFor="upload-portaria" className="cursor-pointer">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-gray-50 transition-colors">
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar Portaria
              </div>
              <input id="upload-portaria" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handlePortariaUpload} />
            </Label>
          </div>
          {extracting && <p className="text-xs text-blue-600 self-end pb-2">Extraindo dados do documento...</p>}
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral">
            <TabsList className="mb-4">
              <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
              <TabsTrigger value="vigencia">Vigência</TabsTrigger>
              <TabsTrigger value="fiscalizacao">Fiscalização</TabsTrigger>
              <TabsTrigger value="portaria">Portaria</TabsTrigger>
            </TabsList>

            {/* ABA: DADOS GERAIS */}
            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Número do Contrato *</Label>
                  <Input value={form.numero} onChange={e => set("numero", e.target.value)} required placeholder="Ex: 12/2025 - JFRN" />
                </div>
                <div className="space-y-1">
                  <Label>Processo SEI</Label>
                  <Input value={form.processo_sei} onChange={e => set("processo_sei", e.target.value)} placeholder="Ex: 0000000-00.0000.0.00.0000" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Objeto do Contrato *</Label>
                <Textarea value={form.objeto} onChange={e => set("objeto", e.target.value)} required placeholder="Descrição do objeto contratado" rows={2} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Empresa Contratada *</Label>
                  <Input value={form.contratada} onChange={e => set("contratada", e.target.value)} required placeholder="Nome da empresa" />
                </div>
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Valor Global (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.valor_global} onChange={e => set("valor_global", e.target.value)} required placeholder="0,00" />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Observações gerais sobre o contrato" rows={2} />
              </div>
            </TabsContent>

            {/* ABA: VIGÊNCIA */}
            <TabsContent value="vigencia" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
                O primeiro cadastro representa a <strong>primeira vigência</strong> do contrato. Futuras prorrogações serão registradas como aditivos.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Data de Início *</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Data de Término *</Label>
                  <Input type="date" value={form.data_fim} onChange={e => set("data_fim", e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Prazo de Vigência Inicial (meses)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.prazo_vigencia_inicial_meses}
                    onChange={e => set("prazo_vigencia_inicial_meses", e.target.value)}
                    placeholder="Calculado automaticamente"
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-400">Calculado automaticamente pelas datas acima</p>
                </div>
                <div className="space-y-1">
                  <Label>Tempo Máximo Permitido (meses)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.tempo_maximo_contrato_meses}
                    onChange={e => set("tempo_maximo_contrato_meses", e.target.value)}
                    placeholder="Ex: 60 para contratos de serviço"
                  />
                  <p className="text-xs text-gray-400">Limite legal ou normativo (ex: 60 meses)</p>
                </div>
              </div>
            </TabsContent>

            {/* ABA: FISCALIZAÇÃO */}
            <TabsContent value="fiscalizacao" className="space-y-5">
              {/* Gestor */}
              <div>
                <h3 className="font-semibold text-sm text-[#1a2e4a] mb-2">Gestor do Contrato</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input value={form.gestor_nome} onChange={e => set("gestor_nome", e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1">
                    <Label>Matrícula</Label>
                    <Input value={form.gestor_matricula} onChange={e => set("gestor_matricula", e.target.value)} placeholder="Ex: RN1070" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email (para notificações)</Label>
                    <Input type="email" value={form.gestor_email} onChange={e => set("gestor_email", e.target.value)} placeholder="gestor@jfrn.jus.br" />
                  </div>
                </div>
              </div>

              {/* Fiscal Titular */}
              <div>
                <h3 className="font-semibold text-sm text-[#1a2e4a] mb-2">Fiscal Titular</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input value={form.fiscal_titular_nome} onChange={e => set("fiscal_titular_nome", e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1">
                    <Label>Matrícula</Label>
                    <Input value={form.fiscal_titular_matricula} onChange={e => set("fiscal_titular_matricula", e.target.value)} placeholder="Ex: RN991" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email (para notificações)</Label>
                    <Input type="email" value={form.fiscal_email} onChange={e => set("fiscal_email", e.target.value)} placeholder="fiscal@jfrn.jus.br" />
                  </div>
                </div>
              </div>

              {/* Fiscal Substituto */}
              <div>
                <h3 className="font-semibold text-sm text-[#1a2e4a] mb-2">Fiscal Substituto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input value={form.fiscal_substituto_nome} onChange={e => set("fiscal_substituto_nome", e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1">
                    <Label>Matrícula</Label>
                    <Input value={form.fiscal_substituto_matricula} onChange={e => set("fiscal_substituto_matricula", e.target.value)} placeholder="Ex: RN973" />
                  </div>
                </div>
              </div>

              {/* Fiscais Setoriais */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-[#1a2e4a]">Fiscais Setoriais</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addFiscalSetorial}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {(form.fiscais_setoriais || []).length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Nenhum fiscal setorial adicionado</p>
                ) : (
                  <div className="space-y-3">
                    {(form.fiscais_setoriais || []).map((fs, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-md bg-gray-50 relative">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input value={fs.nome} onChange={e => updateFiscalSetorial(i, "nome", e.target.value)} placeholder="Nome completo" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Matrícula</Label>
                          <Input value={fs.matricula} onChange={e => updateFiscalSetorial(i, "matricula", e.target.value)} placeholder="Ex: RN335" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Setor / Localidade</Label>
                          <div className="flex gap-2">
                            <Input value={fs.setor} onChange={e => updateFiscalSetorial(i, "setor", e.target.value)} placeholder="Ex: Mossoró" className="h-8 text-sm" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 flex-shrink-0" onClick={() => removeFiscalSetorial(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ABA: PORTARIA */}
            <TabsContent value="portaria" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Número da Portaria</Label>
                  <Input value={form.portaria_numero} onChange={e => set("portaria_numero", e.target.value)} placeholder="Ex: 332/2025" />
                </div>
                <div className="space-y-1">
                  <Label>Data de Publicação</Label>
                  <Input type="date" value={form.portaria_data_publicacao} onChange={e => set("portaria_data_publicacao", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Documento SEI da Portaria</Label>
                  <Input value={form.portaria_documento_sei} onChange={e => set("portaria_documento_sei", e.target.value)} placeholder="Ex: 5445202" />
                </div>
                <div className="space-y-1">
                  <Label>Processo SEI da Fiscalização</Label>
                  <Input value={form.portaria_processo_sei} onChange={e => set("portaria_processo_sei", e.target.value)} placeholder="Ex: 0003480-73.2025.4.05.7100" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-5 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving || extracting}>
              {saving ? "Salvando..." : "Salvar Contrato"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}