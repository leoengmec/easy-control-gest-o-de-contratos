import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';

export const AdicionarItemDialog = ({ contratoId, onItemAdicionado }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    unidade: 'UN',
    valor_unitario: '',
    quantidade_contratada: 1,
    tipo_contrato_manutencao: 'sem_mao_de_obra_residente',
    grupo_servico: 'fixo',
    periodicidade: 'mensal'
  });

  const handleAdicionarItem = async () => {
    try {
      setLoading(true);

      // Validar campos
      if (!formData.nome || !formData.valor_unitario || parseFloat(formData.valor_unitario) <= 0) {
        alert('Preencha todos os campos obrigatórios e garanta que o valor unitário é maior que 0');
        return;
      }

      const valor_total = parseFloat(formData.valor_unitario) * parseInt(formData.quantidade_contratada || 1);

      // Criar item
      const item = await base44.entities.ItemContrato.create({
        contrato_id: contratoId,
        nome: formData.nome,
        descricao: formData.descricao,
        unidade: formData.unidade,
        valor_unitario: parseFloat(formData.valor_unitario),
        quantidade_contratada: parseInt(formData.quantidade_contratada || 1),
        valor_total_contratado: parseFloat(valor_total),
        tipo_contrato_manutencao: formData.tipo_contrato_manutencao,
        grupo_servico: formData.grupo_servico,
        periodicidade: formData.periodicidade,
        ativo: true,
        valor_pago: 0,
        saldo: parseFloat(valor_total),
        percentual_execucao: 0
      });

      // Registrar auditoria
      try {
        if (base44.entities.HistoricoContrato) {
          await base44.entities.HistoricoContrato.create({
            contrato_id: contratoId,
            campo_alterado: 'item_adicionado',
            valor_anterior: 'N/A',
            valor_novo: `${formData.nome} - R$ ${valor_total.toFixed(2)}`,
            data_alteracao: new Date().toISOString(),
            alterado_por: 'sistema',
            motivo: 'Adição de item via formulário',
            ip_address: '127.0.0.1'
          });
        }
      } catch (e) {
        console.warn('Falha silenciosa ao registrar HistoricoContrato:', e);
      }

      if (onItemAdicionado) {
        onItemAdicionado(item);
      }
      
      setFormData({ nome: '', descricao: '', unidade: 'UN', valor_unitario: '', quantidade_contratada: 1, tipo_contrato_manutencao: 'sem_mao_de_obra_residente', grupo_servico: 'fixo', periodicidade: 'mensal' });
      setOpen(false);

      alert('✅ Item adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="w-4 h-4 mr-2"/> Adicionar Item
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Contrato</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Nome do Serviço/Produto *</label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Engenheiro de Campo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <Select value={formData.unidade} onValueChange={(value) => setFormData({ ...formData, unidade: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">Unidade</SelectItem>
                    <SelectItem value="MES">Mês</SelectItem>
                    <SelectItem value="HORA">Hora</SelectItem>
                    <SelectItem value="KG">Kg</SelectItem>
                    <SelectItem value="M">Metro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Valor Unitário *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_unitario}
                  onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Quantidade</label>
              <Input
                type="number"
                value={formData.quantidade_contratada}
                onChange={(e) => setFormData({ ...formData, quantidade_contratada: e.target.value })}
                placeholder="1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Periodicidade</label>
              <Select value={formData.periodicidade} onValueChange={(value) => setFormData({ ...formData, periodicidade: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="eventual">Eventual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="unico">Único</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button onClick={() => setOpen(false)} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleAdicionarItem} disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};