import { base44 } from '@/api/base44Client';

/**
 * Registra ação na auditoria
 * @param {string} usuarioId - ID do usuário
 * @param {string} acao - Tipo de ação
 * @param {string} entidade - Entidade afetada
 * @param {string} entityId - ID da entidade
 * @param {Object} dadosAntes - Dados antes da alteração
 * @param {Object} dadosDepois - Dados depois da alteração
 * @param {string} ipAddress - Endereço IP
 */
export const registrarAuditoria = async (usuarioId, acao, entidade, entityId, dadosAntes, dadosDepois, ipAddress) => {
  try {
    const auditoria = await base44.entities.Auditoria.create({
      usuario_id: usuarioId,
      acao: acao,
      entidade: entidade,
      entity_id: entityId,
      dados_antes: dadosAntes ? JSON.stringify(dadosAntes) : null,
      dados_depois: dadosDepois ? JSON.stringify(dadosDepois) : null,
      ip_address: ipAddress || 'N/A',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      data_acao: new Date().toISOString(),
      status: 'registrado'
    });
    
    console.log(`✅ Auditoria registrada: ${acao} em ${entidade}`);
    return auditoria;
    
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
    throw error;
  }
};

/**
 * Gera relatório de auditoria
 * @param {string} usuarioId - ID do usuário (opcional)
 * @param {Date} dataInicio - Data de início
 * @param {Date} dataFim - Data de fim
 * @returns {Array} Array de registros de auditoria
 */
export const gerarRelatorioAuditoria = async (usuarioId = null, dataInicio, dataFim) => {
  try {
    // Nota: A SDK usa sintaxe de filtro do MongoDB no backend, mas dependendo da versão 
    // a forma de consultar datas pode variar.
    const query = {};
    
    if (usuarioId) {
      query.usuario_id = usuarioId;
    }
    
    const auditorias = await base44.entities.Auditoria.filter(query, '-data_acao');
    
    // Filtro em memória para as datas como fallback de segurança
    const result = auditorias.filter(a => {
      const data = new Date(a.data_acao);
      return data >= dataInicio && data <= dataFim;
    });
    
    return result;
    
  } catch (error) {
    console.error('Erro ao gerar relatório de auditoria:', error);
    throw error;
  }
};

/**
 * Detecta atividades suspeitas
 * @param {string} usuarioId - ID do usuário
 * @returns {Object} { suspeito, motivo, risco }
 */
export const detectarAtividadeSuspeita = async (usuarioId) => {
  try {
    const ultimasAcoes = await base44.entities.Auditoria.filter(
      { usuario_id: usuarioId },
      '-data_acao',
      10
    );
    
    // Verificar múltiplas ações em curto período
    const ultimaHora = new Date(Date.now() - 60 * 60 * 1000);
    const acoesUltimaHora = ultimasAcoes.filter(a => new Date(a.data_acao) > ultimaHora);
    
    if (acoesUltimaHora.length > 20) {
      return {
        suspeito: true,
        motivo: 'Múltiplas ações em curto período',
        risco: 'alto'
      };
    }
    
    // Verificar IPs diferentes
    const ips = [...new Set(ultimasAcoes.map(a => a.ip_address).filter(ip => ip !== 'N/A'))];
    if (ips.length > 5) {
      return {
        suspeito: true,
        motivo: 'Múltiplos endereços IP',
        risco: 'medio'
      };
    }
    
    return {
      suspeito: false,
      motivo: null,
      risco: 'baixo'
    };
    
  } catch (error) {
    console.error('Erro ao detectar atividade suspeita:', error);
    throw error;
  }
};

export default {
  registrarAuditoria,
  gerarRelatorioAuditoria,
  detectarAtividadeSuspeita
};