import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  numero_portaria: z.string().min(3, "Obrigatório"),
  data_designacao: z.string().min(1, "Obrigatório"),
  fiscais: z.array(z.object({
    nome: z.string().min(5, "Mínimo 5 caracteres"),
    matricula: z.string().min(1, "Obrigatório"),
    email: z.string().email("E-mail inválido"),
    telefone: z.string().optional(),
    cargo: z.string().min(3, "Obrigatório"),
    tipo: z.enum(["titular", "substituto", "setorial"])
  })).min(1, "Adicione pelo menos um fiscal")
});

export default function ExtrairDadosPortaria({ isOpen, onClose, contratoId, onSuccess }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_portaria: "",
      data_designacao: "",
      fiscais: [{ nome: "", matricula: "", email: "", telefone: "", cargo: "", tipo: "titular" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fiscais"
  });

  const mutation = useMutation({
    mutationFn: async (dados) => {
      const promises = dados.fiscais.map(fiscal =>
        base44.entities.FiscalPortaria.create({
          contrato_id: contratoId,
          numero_portaria: dados.numero_portaria,
          data_designacao: dados.data_designacao,
          ...fiscal
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Equipe de fiscalização cadastrada com sucesso!");
      onSuccess();
    },
    onError: (err) => {
      toast.error("Erro ao salvar equipe: " + err.message);
    }
  });

  const onSubmit = (dados) => mutation.mutate(dados);

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extrair Dados da Portaria de Fiscalização</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="numero_portaria" render={({ field }) => (
                <FormItem><FormLabel>Número da Portaria *</FormLabel><FormControl><Input placeholder="Ex: 123/2025" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="data_designacao" render={({ field }) => (
                <FormItem><FormLabel>Data de Designação *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-[#1a2e4a]">Equipe de Fiscalização Identificada</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ nome: "", matricula: "", email: "", telefone: "", cargo: "", tipo: "setorial" })}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Fiscal
                </Button>
              </div>

              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border p-4 rounded-lg relative bg-slate-50">
                  <div className="md:col-span-3">
                    <FormField control={form.control} name={`fiscais.${index}.nome`} render={({ field }) => (
                      <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="md:col-span-2">
                    <FormField control={form.control} name={`fiscais.${index}.matricula`} render={({ field }) => (
                      <FormItem><FormLabel>Matrícula *</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="md:col-span-2">
                    <FormField control={form.control} name={`fiscais.${index}.cargo`} render={({ field }) => (
                      <FormItem><FormLabel>Cargo *</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="md:col-span-2">
                    <FormField control={form.control} name={`fiscais.${index}.tipo`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="titular">Titular</SelectItem>
                            <SelectItem value="substituto">Substituto</SelectItem>
                            <SelectItem value="setorial">Setorial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage/>
                      </FormItem>
                    )} />
                  </div>
                  <div className="md:col-span-3">
                    <FormField control={form.control} name={`fiscais.${index}.email`} render={({ field }) => (
                      <FormItem><FormLabel>E-mail *</FormLabel><FormControl><Input type="email" className="bg-white" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500 hover:bg-red-100 hover:text-red-700" onClick={() => remove(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>Ignorar e Fechar</Button>
              <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Equipe de Fiscalização
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}