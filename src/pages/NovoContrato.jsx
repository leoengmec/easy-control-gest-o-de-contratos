import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import ExtrairDadosPortaria from "@/components/contratos/ExtrairDadosPortaria.jsx";

// Validações com Zod atualizadas: IMR e Fiscais removidos
const formSchema = z.object({
  numero: z.string().min(1, "O número do contrato é obrigatório"),
  objeto: z.string().min(1, "O objeto é obrigatório"),
  escopo_resumido: z.string().optional(),
  contratada: z.string().min(1, "Selecione a contratada"),
  data_inicio: z.string().min(1, "Data de início obrigatória"),
  data_fim: z.string().min(1, "Data de término obrigatória"),
  prazo_vigencia_inicial_meses: z.coerce.number().min(1, "Prazo deve ser maior que zero"),
  status: z.enum(["ativo", "encerrado", "suspenso"]),
  processo_sei: z.string().optional(),
  valor_global: z.coerce.number().min(0.01, "Valor global deve ser maior que zero"),
  bdi_normal: z.coerce.number().min(0).max(100).optional(),
  bdi_diferenciado: z.coerce.number().min(0).max(100).optional(),
  desconto_licitacao: z.coerce.number().min(0).max(100).optional(),
  convenio_coletiva_id: z.string().optional(),
  vigencia_reajuste: z.string().optional(),
  vigencia_repacuacao: z.string().optional(),
  limite_orcamento: z.coerce.number().min(0).optional(),
  limite_financeiro: z.coerce.number().min(0).optional(),
  limite_empenho: z.coerce.number().min(0).optional(),
  valor_total_possivel_aditivos: z.coerce.number().min(0).optional(),
  gestor_matricula: z.string().optional()
}).refine(data => new Date(data.data_fim) > new Date(data.data_inicio), {
  message: "Data de término deve ser posterior à data de início",
  path: ["data_fim"],
});

export default function NovoContrato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contratoId = searchParams.get("id");
  const editando = !!contratoId;

  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [arquivoContrato, setArquivoContrato] = useState(null);
  const [arquivoPortaria, setArquivoPortaria] = useState(null);
  const [showModalPortaria, setShowModalPortaria] = useState(false);
  const [novoContratoId, setNovoContratoId] = useState(null);

  // Carregar dados auxiliares
  const { data: contratadas = [] } = useQuery({ queryKey: ['contratadas'], queryFn: () => base44.entities.Contratada.list() });
  const { data: convencoes = [] } = useQuery({ queryKey: ['convencoes'], queryFn: () => base44.entities.ConvencaoColetiva.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => base44.entities.User.list() });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero: "", objeto: "", escopo_resumido: "", contratada: "", data_inicio: "", data_fim: "",
      prazo_vigencia_inicial_meses: 12, status: "ativo", processo_sei: "", valor_global: 0,
      bdi_normal: 0, bdi_diferenciado: 0, desconto_licitacao: 0, convenio_coletiva_id: "",
      vigencia_reajuste: "", vigencia_repacuacao: "", limite_orcamento: 0, limite_financeiro: 0,
      limite_empenho: 0, valor_total_possivel_aditivos: 0, gestor_matricula: ""
    }
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Carregar contrato se estiver editando
  useEffect(() => {
    if (editando) {
      base44.entities.Contrato.get(contratoId).then(data => {
        const formattedData = { ...data };
        ['data_inicio', 'data_fim', 'vigencia_reajuste', 'vigencia_repacuacao'].forEach(field => {
          if (formattedData[field]) {
            formattedData[field] = formattedData[field].split('T')[0];
          }
        });
        
        const getUserIdByName = (name) => {
           if (!name) return "";
           const u = usuarios.find(user => user.full_name === name);
           return u ? u.id : "";
        };
        formattedData.gestor_matricula = getUserIdByName(data.gestor_nome) || data.gestor_matricula;
        form.reset(formattedData);
      }).catch(err => {
        toast.error("Erro ao carregar contrato.");
      });
    }
  }, [contratoId, editando, form, usuarios]);

  const handleUploadAndSave = async (dados) => {
    if (!editando && (!arquivoContrato || !arquivoPortaria)) {
      toast.error('Contrato e Portaria de Fiscalização são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const gestor = usuarios.find(u => u.id === dados.gestor_matricula);
      const payload = {
        ...dados,
        gestor_nome: gestor?.full_name || null
      };

      let currentContratoId = contratoId;
      if (editando) {
        await base44.entities.Contrato.update(currentContratoId, payload);
      } else {
        const novoC = await base44.entities.Contrato.create(payload);
        currentContratoId = novoC.id;
        setNovoContratoId(currentContratoId);
      }

      // Função utilitária para fazer o upload e criar o registro em DocumentoContrato
      const uploadDoc = async (fileObj, docType) => {
        const res = await base44.integrations.Core.UploadFile({ file: fileObj });
        await base44.entities.DocumentoContrato.create({
          contrato_id: currentContratoId,
          tipo: docType,
          nome_arquivo: fileObj.name,
          url_arquivo: res.file_url,
          tamanho_arquivo: fileObj.size,
          tipo_mime: fileObj.type,
          uploaded_by: user?.email || user?.id
        });
      };

      if (arquivoContrato) await uploadDoc(arquivoContrato, 'contrato');
      if (arquivoPortaria) await uploadDoc(arquivoPortaria, 'portaria');

      if (!editando && arquivoPortaria) {
        setShowModalPortaria(true);
      } else {
        toast.success(editando ? "Contrato atualizado com sucesso!" : "Contrato criado com sucesso!");
        navigate(createPageUrl("Contratos"));
      }

    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalPortariaSuccess = () => {
    setShowModalPortaria(false);
    navigate(createPageUrl(`ContratoDetalhe?id=${novoContratoId}`));
  };

  const handleModalPortariaClose = () => {
    setShowModalPortaria(false);
    navigate(createPageUrl("Contratos"));
  };

  const handleFileChange = (e, setFileFn) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("O arquivo excede o limite máximo de 10MB");
        return;
      }
      setFileFn(file);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">{editando ? `Editar Contrato ${form.getValues('numero')}` : "Novo Contrato"}</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleUploadAndSave)} className="space-y-6">
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Informações Gerais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem><FormLabel>Número do Contrato *</FormLabel><FormControl><Input placeholder="Ex: 01/2024" disabled={editando} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="contratada" render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa Contratada *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa contratada" disabled={editando} {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="md:col-span-2">
                <FormField control={form.control} name="objeto" render={({ field }) => (
                  <FormItem><FormLabel>Objeto do Contrato *</FormLabel><FormControl><Textarea placeholder="Descrição principal do serviço" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="md:col-span-2">
                <FormField control={form.control} name="escopo_resumido" render={({ field }) => (
                  <FormItem><FormLabel>Escopo Resumido</FormLabel><FormControl><Textarea placeholder="Resumo exibido no Dashboard" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="processo_sei" render={({ field }) => (
                <FormItem><FormLabel>Processo SEI</FormLabel><FormControl><Input placeholder="Nº do processo" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Prazos e Valores</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="data_inicio" render={({ field }) => (
                <FormItem><FormLabel>Data Início *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="data_fim" render={({ field }) => (
                <FormItem><FormLabel>Data Fim *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="prazo_vigencia_inicial_meses" render={({ field }) => (
                <FormItem><FormLabel>Prazo Vigência (Meses) *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="valor_global" render={({ field }) => (
                <FormItem><FormLabel>Valor Global (R$) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="limite_orcamento" render={({ field }) => (
                <FormItem><FormLabel>Limite Orçamento (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="limite_financeiro" render={({ field }) => (
                <FormItem><FormLabel>Limite Financeiro (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="limite_empenho" render={({ field }) => (
                <FormItem><FormLabel>Limite de Empenho (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="valor_total_possivel_aditivos" render={({ field }) => (
                <FormItem><FormLabel>Limite Aditivos (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Taxas, Acordos e Índices (%)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="bdi_normal" render={({ field }) => (
                <FormItem><FormLabel>BDI Normal (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bdi_diferenciado" render={({ field }) => (
                <FormItem><FormLabel>BDI Diferenciado (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="desconto_licitacao" render={({ field }) => (
                <FormItem><FormLabel>Desconto Licitação (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="md:col-span-3 mt-2">
                <FormField control={form.control} name="convenio_coletiva_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Convenção Coletiva (ACT/CCT)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o acordo..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none" className="text-gray-400">Nenhum / Não aplicável</SelectItem>
                        {convencoes.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} - {c.categoria}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="mt-2">
                <FormField control={form.control} name="vigencia_reajuste" render={({ field }) => (
                  <FormItem><FormLabel>Data Base Reajuste</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="mt-2 md:col-span-2">
                <FormField control={form.control} name="vigencia_repacuacao" render={({ field }) => (
                  <FormItem><FormLabel>Data Base Repactuação</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Gestão do Contrato</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <FormField control={form.control} name="gestor_matricula" render={({ field }) => (
                <FormItem className="md:w-1/3">
                  <FormLabel>Gestor do Contrato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none" className="text-gray-400">Sem gestor atribuído</SelectItem>
                      {usuarios.filter(u => u.role === 'admin' || u.role === 'gestor').map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* SESSÃO: DOCUMENTOS OBRIGATÓRIOS */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold text-[#1a2e4a]">Documentos Obrigatórios</h3>
            <p className="text-sm text-gray-500 mb-4">Adicione a documentação inicial do contrato. Em caso de edição, envie apenas se desejar substituir/incluir novo arquivo.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload Contrato */}
              <div className="space-y-2 border p-4 rounded-lg bg-white shadow-sm hover:border-blue-300 transition-colors">
                <Label htmlFor="contrato" className="font-semibold text-base">Contrato {!editando && "*"}</Label>
                <div className="text-xs text-gray-400 mb-2">Arquivos permitidos: .pdf, .docx, .xlsx (Máx 10MB)</div>
                <div className="relative group cursor-pointer border-2 border-dashed border-gray-200 rounded-md p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-sm text-gray-600 font-medium">Clique ou arraste seu arquivo aqui</span>
                  <Input 
                    id="contrato" 
                    type="file" 
                    accept=".pdf,.docx,.xlsx" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileChange(e, setArquivoContrato)}
                  />
                </div>
                {arquivoContrato && (
                  <div className="mt-3 p-2 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-100 flex items-center">
                    <span className="truncate">✓ {arquivoContrato.name}</span>
                  </div>
                )}
              </div>
              
              {/* Upload Portaria */}
              <div className="space-y-2 border p-4 rounded-lg bg-white shadow-sm hover:border-blue-300 transition-colors">
                <Label htmlFor="portaria" className="font-semibold text-base">Portaria de Fiscalização {!editando && "*"}</Label>
                <div className="text-xs text-gray-400 mb-2">Arquivos permitidos: .pdf, .docx, .xlsx (Máx 10MB)</div>
                <div className="relative group cursor-pointer border-2 border-dashed border-gray-200 rounded-md p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-sm text-gray-600 font-medium">Clique ou arraste seu arquivo aqui</span>
                  <Input 
                    id="portaria" 
                    type="file" 
                    accept=".pdf,.docx,.xlsx" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileChange(e, setArquivoPortaria)}
                  />
                </div>
                {arquivoPortaria && (
                  <div className="mt-3 p-2 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-100 flex items-center">
                    <span className="truncate">✓ {arquivoPortaria.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a] min-w-[200px]" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? "Salvando..." : (editando ? "Atualizar Contrato" : "Salvar Contrato")}
            </Button>
          </div>
        </form>
      </Form>

      {/* MODAL DE EXTRAÇÃO DE DADOS DA PORTARIA */}
      {showModalPortaria && novoContratoId && (
        <ExtrairDadosPortaria 
          isOpen={showModalPortaria} 
          onClose={handleModalPortariaClose} 
          contratoId={novoContratoId} 
          onSuccess={handleModalPortariaSuccess}
        />
      )}
    </div>
  );
}