import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function ContratoForm({ contrato, onSave, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    // Campos Novos
    numero_contrato: "",
    empresa: "",
    // Campos Legados (mantidos para compatibilidade)
    numero: "",
    contratada: "",
    // Outros campos
    objeto: "",
    cnpj: "",
    valor_global: "",
    data_inicio: "",
    data_fim: "",
    status: "Ativo"
  });

  useEffect(() => {
    if (contrato) {
      setForm({
        ...contrato,
        numero_contrato: contrato.numero_contrato || contrato.numero || "",
        empresa: contrato.empresa || contrato.contratada || "",
        numero: contrato.numero || contrato.numero_contrato || "",
        contratada: contrato.contratada || contrato.empresa || ""
      });
    }
  }, [contrato]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // REGRA DE OURO: Espelhamos os dados para garantir que nenhuma tela "detone"
      const payload = {
        ...form,
        numero: form.numero_contrato, // Legado recebe Novo
        contratada: form.empresa,     // Legado recebe Novo
        valor_global: parseFloat(form.valor_global) || 0
      };

      if (contrato?.id) {
        await base44.entities.Contrato.update(contrato.id, payload);
        toast.success("Contrato atualizado com sucesso!");
      } else {
        await base44.entities.Contrato.create(payload);
        toast.success("Contrato criado com sucesso!");
      }
      
      if (onSave) onSave();
    } catch (error) {
      toast.error("Erro ao salvar contrato");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-t-4 border-[#1a2e4a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black text-[#1a2e4a] uppercase">
            {contrato ? "Editar Contrato" : "Novo Contrato"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="geral" className="uppercase text-[10px] font-bold">Dados Principais</TabsTrigger>
              <TabsTrigger value="vigencia" className="uppercase text-[10px] font-bold">Prazos e Valores</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Número do Contrato</Label>
                  <Input 
                    value={form.numero_contrato} 
                    onChange={e => setForm({...form, numero_contrato: e.target.value})} 
                    placeholder="Ex: 01/2025" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Empresa / Contratada</Label>
                  <Input 
                    value={form.empresa} 
                    onChange={e => setForm({...form, empresa: e.target.value})} 
                    placeholder="Razão Social" 
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Objeto do Contrato</Label>
                <Textarea 
                  value={form.objeto} 
                  onChange={e => setForm({...form, objeto: e.target.value})} 
                  placeholder="Descrição sucinta do objeto..."
                  className="h-24"
                />
              </div>
            </TabsContent>

            <TabsContent value="vigencia" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Início Vigência</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Fim Vigência</Label>
                  <Input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Valor Global (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.valor_global} 
                    onChange={e => setForm({...form, valor_global: e.target.value})} 
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6 border-t mt-4">
            <Button type="button" variant="ghost" onClick={onCancel} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button 
              type="submit" 
              disabled={saving} 
              className="bg-[#1a2e4a] hover:bg-[#2c4a75] uppercase text-[10px] font-black px-10"
            >
              {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Contrato</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}