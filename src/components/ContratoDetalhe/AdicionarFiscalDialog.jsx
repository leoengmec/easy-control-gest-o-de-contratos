import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';

export const AdicionarFiscalDialog = ({ contratoId, onFiscalAdicionado }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    email: '',
    telefone: '',
    cargo: '',
    tipo: 'titular'
  });

  const handleAdicionarFiscal = async () => {
    try {
      setLoading(true);

      // Validar campos obrigatórios
      if (!formData.nome || !formData.email || !formData.tipo) {
        alert('Preencha todos os campos obrigatórios (Nome, Email e Tipo)');
        return;
      }

      // Criar fiscal no banco
      const fiscal = await base44.entities.FiscalPortaria.create({
        contrato_id: contratoId,
        nome: formData.nome,
        matricula: formData.matricula,
        email: formData.email,
        telefone: formData.telefone,
        cargo: formData.cargo,
        tipo: formData.tipo,
        data_designacao: new Date().toISOString(),
        numero_portaria: 'A definir'
      });

      // Registrar auditoria
      try {
        if (base44.entities.HistoricoContrato) {
          await base44.entities.HistoricoContrato.create({
            contrato_id: contratoId,
            campo_alterado: 'fiscal_adicionado',
            valor_anterior: 'N/A',
            valor_novo: `${formData.nome} (${formData.tipo})`,
            data_alteracao: new Date().toISOString(),
            alterado_por: 'sistema',
            motivo: 'Adição de fiscal via formulário',
            ip_address: '127.0.0.1'
          });
        }
      } catch (e) {
        console.warn('Falha silenciosa ao registrar HistoricoContrato:', e);
      }

      // Callback para atualizar lista
      if (onFiscalAdicionado) {
        onFiscalAdicionado(fiscal);
      }

      // Limpar formulário
      setFormData({ nome: '', matricula: '', email: '', telefone: '', cargo: '', tipo: 'titular' });
      setOpen(false);

      alert('✅ Fiscal adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar fiscal:', error);
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <Plus className="w-4 h-4 mr-2"/> Adicionar Fiscal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fiscal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Matrícula</label>
              <Input
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                placeholder="Matrícula"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cargo</label>
              <Input
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Cargo/Função"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tipo *</label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="titular">Titular</SelectItem>
                  <SelectItem value="substituto">Substituto</SelectItem>
                  <SelectItem value="setorial">Setorial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button onClick={() => setOpen(false)} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleAdicionarFiscal} disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};