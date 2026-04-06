import { base44 } from '@/api/base44Client';

export const criarHistoricoContrato = async (contratoId, campoAlterado, valorAnterior, valorNovo, motivo, userId) => {
  try {
    const historico = await base44.entities.HistoricoContrato.create({
      contrato_id: contratoId,
      campo_alterado: campoAlterado,
      valor_anterior: String(valorAnterior),
      valor_novo: String(valorNovo),
      data_alteracao: new Date().toISOString(),
      alterado_por: userId || 'sistema',
      motivo: motivo,
      ip_address: '127.0.0.1'
    });
    
    return historico;
    
  } catch (error) {
    console.error('Erro ao criar histórico:', error);
    throw error;
  }
};

export default criarHistoricoContrato;