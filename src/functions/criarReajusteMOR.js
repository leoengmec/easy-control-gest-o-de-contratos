import { calcularReajuste } from '@/utils/calculos';
import { base44 } from '@/api/base44Client';

export const criarReajusteMOR = async (contratoId, convencaoId) => {
  try {
    // 1. Buscar contrato e convenção
    const contrato = await base44.entities.Contrato.get(contratoId);
    const convencao = await base44.entities.ConvencaoColetiva.get(convencaoId);
    
    if (!contrato) throw new Error('Contrato não encontrado');
    if (!convencao) throw new Error('Convenção coletiva não encontrada');
    
    // 2. Buscar APENAS itens de MOR
    const itensMOR = await base44.entities.ItemContrato.filter({
      contrato_id: contratoId,
      tipo_contrato_manutencao: 'com_mao_de_obra_residente'
    });
    
    if (itensMOR.length === 0) {
      console.log('Nenhum item de MOR encontrado para reajuste');
      return null;
    }
    
    const valorAtualMOR = itensMOR.reduce((sum, item) => sum + item.valor_total_contratado, 0);
    
    // 3. Usar função pura para calcular reajuste
    const reajuste = calcularReajuste(valorAtualMOR, convencao.percentual_reajuste, 'convenção_coletiva');
    
    // 4. Criar registro em Reajuste
    const novoReajuste = await base44.entities.Reajuste.create({
      contrato_id: contratoId,
      data_reajuste: new Date(convencao.data_base || new Date()).toISOString(), // Usando data_base da convenção caso exista
      tipo: 'mor',
      indice_aplicado: convencao.numero,
      valor_anterior: reajuste.valor_anterior,
      novo_valor: reajuste.novo_valor,
      percentual_reajuste: reajuste.percentual_reajuste,
      status: 'pendente_aprovacao',
      justificativa: `Reajuste MOR conforme ${convencao.numero} - ${convencao.sindicato}`
    });
    
    // 5. Criar AlertaContrato (ajustado para ser consistente, simulando se não existir a entidade exata)
    try {
      await base44.entities.AlertaContrato.create({
        contrato_id: contratoId,
        tipo: 'reajuste_pendente',
        descricao: `Reajuste MOR de ${convencao.percentual_reajuste}% conforme ${convencao.numero}`,
        data_alerta: new Date().toISOString(),
        data_vencimento: new Date(convencao.data_vigencia_inicio || new Date()).toISOString(),
        status: 'ativo',
        prioridade: 'alta',
        notificacoes_enviadas: 0
      });
    } catch (e) {
      console.warn("Entidade AlertaContrato pode não existir ainda", e);
    }
    
    // 6. Criar HistoricoContrato
    try {
      await base44.entities.HistoricoContrato.create({
        contrato_id: contratoId,
        campo_alterado: 'reajuste_mor_criado',
        valor_anterior: reajuste.valor_anterior.toFixed(2),
        valor_novo: reajuste.novo_valor.toFixed(2),
        data_alteracao: new Date().toISOString(),
        alterado_por: 'sistema',
        motivo: `Reajuste MOR automático - ${convencao.numero}`,
        ip_address: '127.0.0.1'
      });
    } catch (e) {
      console.warn("Entidade HistoricoContrato pode não existir ainda", e);
    }
    
    return novoReajuste;
    
  } catch (error) {
    console.error('Erro ao criar reajuste MOR:', error);
    throw error;
  }
};

export default criarReajusteMOR;