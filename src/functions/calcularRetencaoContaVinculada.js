import { calcularRetencaoMensal } from '@/utils/calculos';
import { base44 } from '@/api/base44Client';

export const calcularRetencaoContaVinculada = async (contratoId, mes, ano) => {
  try {
    // 1. Validar entrada
    if (!contratoId || !mes || !ano) {
      throw new Error('contratoId, mes e ano são obrigatórios');
    }
    if (mes < 1 || mes > 12) {
      throw new Error('Mês deve estar entre 1 e 12');
    }
    
    // 2. Buscar todos os PostoTrabalho do contrato
    const postos = await base44.entities.PostoTrabalho.filter({
      contrato_id: contratoId,
      status: 'ativo'
    });
    
    if (postos.length === 0) {
      throw new Error('Nenhum posto de trabalho ativo encontrado para este contrato');
    }
    
    // 3. Usar função pura para calcular retenção
    const totaisRetencao = calcularRetencaoMensal(postos);
    
    // 4. Criar registro em ContaVinculada (ou histórico, preenchendo os obrigatórios)
    const contaVinculada = await base44.entities.ContaVinculada.create({
      contrato_id: contratoId,
      mes: mes,
      ano: ano,
      remuneracao_total: totaisRetencao.remuneracao_total,
      valor_13_salario: totaisRetencao.valor_13_salario,
      valor_ferias: totaisRetencao.valor_ferias,
      valor_1_3_ferias: totaisRetencao.valor_1_3_ferias,
      subtotal_provisao: totaisRetencao.subtotal_provisao,
      valor_grupo_a: totaisRetencao.valor_grupo_a,
      valor_multa_fgts: totaisRetencao.valor_multa_fgts,
      total_reter: totaisRetencao.total_reter,
      status_retirada: 'pendente',
      // Campos obrigatórios do schema atual da ContaVinculada
      banco: 'N/A',
      agencia: 'N/A',
      conta: 'N/A'
    });
    
    // 5. Atualizar Contrato.retenção_mensal_calculada
    await base44.entities.Contrato.update(contratoId, {
      retencao_mensal_calculada: totaisRetencao.total_reter
    });
    
    // 6. Criar HistoricoContrato para auditoria
    await base44.entities.HistoricoContrato.create({
      contrato_id: contratoId,
      campo_alterado: 'conta_vinculada_calculada',
      valor_anterior: 'N/A',
      valor_novo: `Retenção ${mes}/${ano}: R$ ${totaisRetencao.total_reter.toFixed(2)}`,
      data_alteracao: new Date().toISOString(),
      alterado_por: 'sistema',
      motivo: 'Cálculo automático de retenção de conta vinculada',
      ip_address: '127.0.0.1'
    });
    
    return contaVinculada;
    
  } catch (error) {
    console.error('Erro ao calcular retenção de conta vinculada:', error);
    throw error;
  }
};

export default calcularRetencaoContaVinculada;