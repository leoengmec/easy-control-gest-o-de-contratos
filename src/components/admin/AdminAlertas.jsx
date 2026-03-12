import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminAlertas() {
  const [alertas, setAlertas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [criando, setCriando] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "vencimento_contrato",
    ativo: true,
    dias_antecedencia: 30,
    percentual_orcamento: 80,
    contrato_id: "",
    user_id: "",
    descricao: ""
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [alertasData, contratosData, usuariosData] = await Promise.all([
        base44.entities.ConfiguracaoAlerta.list(),
        base44.entities.Contrato.list(),
        base44.entities.User.list()
      ]);
      setAlertas(alertasData);
      setContratos(contratosData);
      setUsuarios(usuariosData);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    }
  };

  const handleSalvar = async () => {
    try {
      const dados = {
        ...formData,
        contrato_id: formData.contrato_id || null,
        user_id: formData.user_id || null
      };

      if (editando) {
        await base44.entities.ConfiguracaoAlerta.update(editando.id, dados);
        toast.success("Alerta atualizado com sucesso");
      } else {
        await base44.entities.ConfiguracaoAlerta.create(dados);
        toast.success("Alerta criado com sucesso");
      }

      setEditando(null);
      setCriando(false);
      setFormData({
        tipo: "vencimento_contrato",
        ativo: true,
        dias_antecedencia: 30,
        percentual_orcamento: 80,
        contrato_id: "",
        user_id: "",
        descricao: ""
      });
      carregarDados();
    } catch (error) {
      toast.error("Erro ao salvar alerta");
    }
  };

  const handleEditar = (alerta) => {
    setEditando(alerta);
    setFormData({
      tipo: alerta.tipo,
      ativo: alerta.ativo,
      dias_antecedencia: alerta.dias_antecedencia || 30,
      percentual_orcamento: alerta.percentual_orcamento || 80,
      contrato_id: alerta.contrato_id || "",
      user_id: alerta.user_id || "",
      descricao: alerta.descricao || ""
    });
    setCriando(false);
  };

  const handleExcluir = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este alerta?")) return;
    try {
      await base44.entities.ConfiguracaoAlerta.delete(id);
      toast.success("Alerta excluído com sucesso");
      carregarDados();
    } catch (error) {
      toast.error("Erro ao excluir alerta");
    }
  };

  const handleNovo = () => {
    setCriando(true);
    setEditando(null);
    setFormData({
      tipo: "vencimento_contrato",
      ativo: true,
      dias_antecedencia: 30,
      percentual_orcamento: 80,
      contrato_id: "",
      user_id: "",
      descricao: ""
    });
  };

  const handleCancelar = () => {
    setCriando(false);
    setEditando(null);
    setFormData({
      tipo: "vencimento_contrato",
      ativo: true,
      dias_antecedencia: 30,
      percentual_orcamento: 80,
      contrato_id: "",
      user_id: "",
      descricao: ""
    });
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      vencimento_contrato: "Vencimento de Contrato",
      aprovacao_lancamento: "Aprovação de Lançamento",
      limite_orcamento: "Limite de Orçamento"
    };
    return tipos[tipo] || tipo;
  };

  const getContratoNome = (contratoId) => {
    if (!contratoId) return "Todos os contratos";
    const contrato = contratos.find(c => c.id === contratoId);
    return contrato ? contrato.numero : "N/A";
  };

  const getUserNome = (userId) => {
    if (!userId) return "Todos os usuários";
    const usuario = usuarios.find(u => u.id === userId);
    return usuario ? usuario.full_name : "N/A";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Configuração de Alertas</h2>
        </div>
        <Button onClick={handleNovo} disabled={criando || editando}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Alerta
        </Button>
      </div>

      {(criando || editando) && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">
              {editando ? "Editar Alerta" : "Criar Novo Alerta"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Alerta *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vencimento_contrato">Vencimento de Contrato</SelectItem>
                    <SelectItem value="aprovacao_lancamento">Aprovação de Lançamento</SelectItem>
                    <SelectItem value="limite_orcamento">Limite de Orçamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contrato Específico</Label>
                <Select value={formData.contrato_id} onValueChange={(v) => setFormData({...formData, contrato_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os contratos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos os contratos</SelectItem>
                    {contratos.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Usuário Específico</Label>
                <Select value={formData.user_id} onValueChange={(v) => setFormData({...formData, user_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os usuários (global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos os usuários (global)</SelectItem>
                    {usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === "vencimento_contrato" && (
                <div className="space-y-2">
                  <Label>Dias de Antecedência</Label>
                  <Input
                    type="number"
                    value={formData.dias_antecedencia}
                    onChange={(e) => setFormData({...formData, dias_antecedencia: parseInt(e.target.value)})}
                  />
                </div>
              )}

              {formData.tipo === "limite_orcamento" && (
                <div className="space-y-2">
                  <Label>Percentual do Orçamento (%)</Label>
                  <Input
                    type="number"
                    value={formData.percentual_orcamento}
                    onChange={(e) => setFormData({...formData, percentual_orcamento: parseInt(e.target.value)})}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                />
                <Label>Alerta Ativo</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Descrição opcional do alerta"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSalvar}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" onClick={handleCancelar}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {alertas.map(alerta => (
          <Card key={alerta.id} className={alerta.ativo ? "border-l-4 border-l-green-500" : "border-l-4 border-l-gray-300"}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${alerta.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {alerta.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-sm font-semibold">{getTipoLabel(alerta.tipo)}</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Contrato:</strong> {getContratoNome(alerta.contrato_id)}</p>
                    <p><strong>Usuário:</strong> {getUserNome(alerta.user_id)}</p>
                    {alerta.dias_antecedencia && (
                      <p><strong>Antecedência:</strong> {alerta.dias_antecedencia} dias</p>
                    )}
                    {alerta.percentual_orcamento && (
                      <p><strong>Percentual:</strong> {alerta.percentual_orcamento}%</p>
                    )}
                    {alerta.descricao && (
                      <p className="text-gray-500 italic">{alerta.descricao}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditar(alerta)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleExcluir(alerta.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {alertas.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Nenhum alerta configurado. Clique em "Novo Alerta" para criar.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}