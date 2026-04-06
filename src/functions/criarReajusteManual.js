import { calcularReajuste } from '@/utils/calculos';
import { base44 } from '@/api/base44Client';

export const criarReajusteManual = async (contratoId, tipoServico, indiceAplicado, percentualReajuste, justificativa, userId) => {
  try {
    // 1. Validar tipo de serviço
    const tiposValidos = ['servico_eventual', 'material', 'equipamento', 'deslocamento'];
    if (!tiposValidos.includes(tipoServico)) {
      throw new Error(`Tipo de serviço inválido: ${tipoServico}`);
    }
    
    // 2. Buscar contrato
    const contrato = await base44.entities.Contrato.get(contratoId);
    if (!contrato) throw new Error('Contrato não encontrado');
    
    // 3. Mapear tipos de serviço para tipos de item (simplificado de acordo com a regra de negócio atual)
    const tiposItemMap = {
      'servico_eventual': 'com_mao_de_obra_residente',
      'material': 'com_mao_de_obra_residente',
      'equipamento': 'com_mao_de_obra_residente',
      'deslocamento': 'com_mao_de_obra_residente'
    };
    
    // 4. Buscar itens do tipo de serviço
    const itensServico = await base44.entities.ItemContrato.filter({
      contrato_id: contratoId,
      tipo_contrato_manutencao: tiposItemMap[tipoServico]
    });
    
    if (itensServico.length === 0) {
      throw new Error(`Nenhum item de ${tipoServico} encontrado para reajuste`);
    }
    
    const valorAtualServico = itensServico.reduce((sum, item) => sum + item.valor_total_contratado, 0);
    
    // 5. Usar função pura para calcular reajuste
    const reajuste = calcularReajuste(valorAtualServico, percentualReajuste, indiceAplicado);
    
    // 6. Criar registro em Reajuste
    const novoReajuste = await base44.entities.Reajuste.create({
      contrato_id: contratoId,
      data_reajuste: new Date().toISOString(),
      tipo: tipoServico,
      indice_aplicado: indiceAplicado,
      valor_anterior: reajuste.valor_anterior,
      novo_valor: reajuste.novo_valor,
      percentual_reajuste: reajuste.percentual_reajuste,
      status: 'pendente_aprovacao',
      justificativa: justificativa
    });
    
    // 7. Criar AlertaContrato (com tratamento caso a entidade não exista)
    try {
      await base44.entities.AlertaContrato.create({
        contrato_id: contratoId,
        tipo: 'reajuste_pendente',
        descricao: `Reajuste ${tipoServico} de ${percentualReajuste}% (${indiceAplicado})`,
        data_alerta: new Date().toISOString(),
        data_vencimento: null,
        status: 'ativo',
        prioridade: 'alta',
        notificacoes_enviadas: 0
      });
    } catch (e) {
      console.warn("Entidade AlertaContrato pode não existir ainda", e);
    }
    
    // 8. Criar HistoricoContrato (com tratamento caso a entidade não exista)
    try {
      await base44.entities.HistoricoContrato.create({
        contrato_id: contratoId,
        campo_alterado: `reajuste_${tipoServico}`,
        valor_anterior: reajuste.valor_anterior.toFixed(2),
        valor_novo: reajuste.novo_valor.toFixed(2),
        data_alteracao: new Date().toISOString(),
        alterado_por: userId || 'sistema',
        motivo: justificativa,
        ip_address: '127.0.0.1'
      });
    } catch (e) {
      console.warn("Entidade HistoricoContrato pode não existir ainda", e);
    }
    
    return novoReajuste;
    
  } catch (error) {
    console.error('Erro ao criar reajuste manual:', error);
    throw error;
  }
};

export default criarReajusteManual;