import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const COR_OPCOES = [
  { valor: "gray", nome: "Cinza", preview: "bg-gray-100 text-gray-700 border-gray-300" },
  { valor: "blue", nome: "Azul", preview: "bg-blue-100 text-blue-700 border-blue-300" },
  { valor: "green", nome: "Verde", preview: "bg-green-100 text-green-700 border-green-300" },
  { valor: "yellow", nome: "Amarelo", preview: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { valor: "red", nome: "Vermelho", preview: "bg-red-100 text-red-700 border-red-300" },
  { valor: "purple", nome: "Roxo", preview: "bg-purple-100 text-purple-700 border-purple-300" },
  { valor: "orange", nome: "Laranja", preview: "bg-orange-100 text-orange-700 border-orange-300" },
];

export default function AdminStatusLancamento() {
  const [statusList, setStatusList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: "", cor: "blue", ordem: 0, ativo: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await base44.entities.ConfiguracaoStatusLancamento.list("-ordem");
      setStatusList(data);
    } catch (error) {
      toast.error("Erro ao carregar status");
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("O nome do status é obrigatório");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await base44.entities.ConfiguracaoStatusLancamento.update(editingId, formData);
        toast.success("Status atualizado com sucesso");
      } else {
        await base44.entities.ConfiguracaoStatusLancamento.create({
          ...formData,
          ordem: statusList.length + 1,
        });
        toast.success("Status criado com sucesso");
      }
      
      setFormData({ nome: "", cor: "blue", ordem: 0, ativo: true });
      setEditingId(null);
      loadStatus();
    } catch (error) {
      toast.error("Erro ao salvar status");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (status) => {
    setEditingId(status.id);
    setFormData({
      nome: status.nome,
      cor: status.cor || "blue",
      ordem: status.ordem || 0,
      ativo: status.ativo !== false,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este status?")) return;
    
    try {
      await base44.entities.ConfiguracaoStatusLancamento.delete(id);
      toast.success("Status excluído com sucesso");
      loadStatus();
    } catch (error) {
      toast.error("Erro ao excluir status");
    }
  };

  const handleToggleAtivo = async (id, ativo) => {
    try {
      await base44.entities.ConfiguracaoStatusLancamento.update(id, { ativo: !ativo });
      loadStatus();
      toast.success(ativo ? "Status desativado" : "Status ativado");
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  };

  const corAtual = COR_OPCOES.find(c => c.valor === formData.cor);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1a2e4a]">
            {editingId ? "Editar Status" : "Novo Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Status</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Em instrução"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cor</Label>
                <Select
                  value={formData.cor}
                  onValueChange={(v) => setFormData({ ...formData, cor: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COR_OPCOES.map((cor) => (
                      <SelectItem key={cor.valor} value={cor.valor}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border ${cor.preview}`} />
                          {cor.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label>Preview:</Label>
              <Badge variant="outline" className={corAtual?.preview}>
                {formData.nome || "Nome do Status"}
              </Badge>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ nome: "", cor: "blue", ordem: 0, ativo: true });
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={loading || !formData.nome.trim()}
                className="bg-[#1a2e4a] hover:bg-[#2a4a7a]"
              >
                {loading ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1a2e4a]">Status Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {statusList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhum status cadastrado. Adicione o primeiro status acima.
            </p>
          ) : (
            <div className="space-y-2">
              {statusList.map((status) => {
                const corConfig = COR_OPCOES.find(c => c.valor === status.cor);
                return (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <Badge variant="outline" className={corConfig?.preview}>
                        {status.nome}
                      </Badge>
                      {!status.ativo && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-500 text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500">Ativo</Label>
                        <Switch
                          checked={status.ativo !== false}
                          onCheckedChange={() => handleToggleAtivo(status.id, status.ativo)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(status)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(status.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}