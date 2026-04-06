import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Validações com Zod
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
  imr: z.coerce.number().min(0).max(100).optional(),
  convenio_coletiva_id: z.string().optional(),
  vigencia_reajuste: z.string().optional(),
  vigencia_repacuacao: z.string().optional(),
  limite_orcamento: z.coerce.number().min(0).optional(),
  limite_financeiro: z.coerce.number().min(0).optional(),
  limite_empenho: z.coerce.number().min(0).optional(),
  valor_total_possivel_aditivos: z.coerce.number().min(0).optional(),
  gestor_matricula: z.string().optional(),
  fiscal_titular_matricula: z.string().optional(),
  fiscal_substituto_matricula: z.string().optional(),
  portaria_numero: z.string().optional(),
  portaria_data_publicacao: z.string().optional()
}).refine(data => new Date(data.data_fim) > new Date(data.data_inicio), {
  message: "Data de término deve ser posterior à data de início",
  path: ["data_fim"],
});

export default function NovoContrato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contratoId = searchParams.get("id");
  const editando = !!contratoId;

  // Carregar dados auxiliares
  const { data: contratadas = [] } = useQuery({ queryKey: ['contratadas'], queryFn: () => base44.entities.Contratada.list() });
  const { data: convencoes = [] } = useQuery({ queryKey: ['convencoes'], queryFn: () => base44.entities.ConvencaoColetiva.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => base44.entities.User.list() });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero: "", objeto: "", escopo_resumido: "", contratada: "", data_inicio: "", data_fim: "",
      prazo_vigencia_inicial_meses: 12, status: "ativo", processo_sei: "", valor_global: 0,
      bdi_normal: 0, bdi_diferenciado: 0, desconto_licitacao: 0, imr: 0, convenio_coletiva_id: "",
      vigencia_reajuste: "", vigencia_repacuacao: "", limite_orcamento: 0, limite_financeiro: 0,
      limite_empenho: 0, valor_total_possivel_aditivos: 0, gestor_matricula: "", fiscal_titular_matricula: "",
      fiscal_substituto_matricula: "", portaria_numero: "", portaria_data_publicacao: ""
    }
  });

  // Carregar contrato se estiver editando
  useEffect(() => {
    if (editando) {
      base44.entities.Contrato.get(contratoId).then(data => {
        // Formata as datas para os inputs type="date"
        const formattedData = { ...data };
        ['data_inicio', 'data_fim', 'vigencia_reajuste', 'vigencia_repacuacao', 'portaria_data_publicacao'].forEach(field => {
          if (formattedData[field]) {
            formattedData[field] = formattedData[field].split('T')[0];
          }
        });
        
        // Match user names and extract their ID/matricula for select fields
        const getUserIdByName = (name) => {
           if (!name) return "";
           const u = usuarios.find(user => user.full_name === name);
           return u ? u.id : "";
        };
        
        formattedData.gestor_matricula = getUserIdByName(data.gestor_nome) || data.gestor_matricula;
        formattedData.fiscal_titular_matricula = getUserIdByName(data.fiscal_titular_nome) || data.fiscal_titular_matricula;
        formattedData.fiscal_substituto_matricula = getUserIdByName(data.fiscal_substituto_nome) || data.fiscal_substituto_matricula;

        form.reset(formattedData);
      }).catch(err => {
        toast.error("Erro ao carregar contrato.");
        console.error(err);
      });
    }
  }, [contratoId, editando, form, usuarios]);

  const mutation = useMutation({
    mutationFn: async (dados) => {
      // Find user names based on selected IDs (we stored user ID in the matricula fields in the form temporarily)
      const gestor = usuarios.find(u => u.id === dados.gestor_matricula);
      const fiscalTit = usuarios.find(u => u.id === dados.fiscal_titular_matricula);
      const fiscalSub = usuarios.find(u => u.id === dados.fiscal_substituto_matricula);

      const payload = {
        ...dados,
        gestor_nome: gestor?.full_name || null,
        fiscal_titular_nome: fiscalTit?.full_name || null,
        fiscal_substituto_nome: fiscalSub?.full_name || null,
      };

      if (editando) {
        return await base44.entities.Contrato.update(contratoId, payload);
      } else {
        return await base44.entities.Contrato.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Contrato atualizado com sucesso!" : "Contrato criado com sucesso!");
      navigate(createPageUrl("Contratos"));
    },
    onError: (err) => {
      toast.error("Erro ao salvar contrato. " + (err.message || ""));
    }
  });

  const onSubmit = (dados) => {
    mutation.mutate(dados);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">{editando ? `Editar Contrato ${form.getValues('numero')}` : "Novo Contrato"}</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Informações Gerais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem><FormLabel>Número do Contrato *</FormLabel><FormControl><Input placeholder="Ex: 01/2024" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="contratada" render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa Contratada *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {contratadas.map(c => <SelectItem key={c.id} value={c.razao_social}>{c.razao_social} - {c.cnpj}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="bdi_normal" render={({ field }) => (
                <FormItem><FormLabel>BDI Normal (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bdi_diferenciado" render={({ field }) => (
                <FormItem><FormLabel>BDI Diferenciado (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="desconto_licitacao" render={({ field }) => (
                <FormItem><FormLabel>Desconto Licitação (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="imr" render={({ field }) => (
                <FormItem><FormLabel>IMR Máximo (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="md:col-span-2 mt-2">
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
              <div className="mt-2">
                <FormField control={form.control} name="vigencia_repacuacao" render={({ field }) => (
                  <FormItem><FormLabel>Data Base Repactuação</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Equipe de Fiscalização</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="gestor_matricula" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gestor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
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
              
              <FormField control={form.control} name="fiscal_titular_matricula" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Titular</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none" className="text-gray-400">Sem fiscal atribuído</SelectItem>
                      {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="fiscal_substituto_matricula" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Substituto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none" className="text-gray-400">Sem fiscal substituto</SelectItem>
                      {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="portaria_numero" render={({ field }) => (
                <FormItem><FormLabel>Número da Portaria</FormLabel><FormControl><Input placeholder="Ex: 332/2025" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="portaria_data_publicacao" render={({ field }) => (
                <FormItem><FormLabel>Data de Publicação (Portaria)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editando ? "Atualizar Contrato" : "Salvar Novo Contrato"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}