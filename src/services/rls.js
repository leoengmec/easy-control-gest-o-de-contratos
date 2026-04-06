/**
 * Filtra contratos por usuário (RLS)
 * @param {string} usuarioId - ID do usuário
 * @param {string} usuarioRole - Role do usuário
 * @returns {Object} Filtro para query
 */
export const filtroContratosPorUsuario = (usuarioId, usuarioRole) => {
  // Admin/Owner veem todos os contratos
  if (usuarioRole === 'admin' || usuarioRole === 'owner') {
    return {};
  }
  
  // Gestor vê apenas contratos que gerencia
  if (usuarioRole === 'gestor') {
    return { gestor_id: usuarioId };
  }
  
  // Fiscal vê apenas contratos que fiscaliza
  if (usuarioRole === 'fiscal') {
    return { 'fiscais.fiscal_id': usuarioId };
  }
  
  // Terceirizado vê apenas seu próprio contrato
  if (usuarioRole === 'terceirizado') {
    return { contratada_id: usuarioId };
  }
  
  // Por padrão, nenhum acesso
  return { id: null };
};

/**
 * Filtra lançamentos por usuário (RLS)
 * @param {string} usuarioId - ID do usuário
 * @param {string} usuarioRole - Role do usuário
 * @returns {Object} Filtro para query
 */
export const filtroLancamentosPorUsuario = (usuarioId, usuarioRole) => {
  // Admin/Owner veem todos
  if (usuarioRole === 'admin' || usuarioRole === 'owner') {
    return {};
  }
  
  // Gestor vê lançamentos de contratos que gerencia
  if (usuarioRole === 'gestor') {
    return { 'contrato.gestor_id': usuarioId };
  }
  
  // Fiscal vê lançamentos de contratos que fiscaliza
  if (usuarioRole === 'fiscal') {
    return { 'contrato.fiscais.fiscal_id': usuarioId };
  }
  
  // Terceirizado vê apenas lançamentos de seu contrato
  if (usuarioRole === 'terceirizado') {
    return { 'contrato.contratada_id': usuarioId };
  }
  
  return { id: null };
};

/**
 * Filtra reajustes por permissão (RLS)
 * @param {string} usuarioRole - Role do usuário
 * @returns {Object} Filtro para query
 */
export const filtroReajustesPorPermissao = (usuarioRole) => {
  // Admin/Owner veem todos
  if (usuarioRole === 'admin' || usuarioRole === 'owner') {
    return {};
  }
  
  // Gestor vê reajustes pendentes (não aprovados)
  if (usuarioRole === 'gestor') {
    return { status: 'pendente_aprovacao' };
  }
  
  // Outros roles não veem reajustes
  return { id: null };
};

/**
 * Aplica RLS a uma query
 * @param {Array} registros - Array de registros
 * @param {string} usuarioId - ID do usuário
 * @param {string} usuarioRole - Role do usuário
 * @param {string} entidade - Nome da entidade
 * @returns {Array} Registros filtrados
 */
export const aplicarRLS = (registros, usuarioId, usuarioRole, entidade) => {
  if (!Array.isArray(registros)) {
    return registros;
  }
  
  switch (entidade) {
    case 'Contrato':
      return registros.filter(r => {
        if (usuarioRole === 'admin' || usuarioRole === 'owner') return true;
        if (usuarioRole === 'gestor') return r.gestor_id === usuarioId;
        if (usuarioRole === 'fiscal') return r.fiscais?.some(f => f.fiscal_id === usuarioId);
        if (usuarioRole === 'terceirizado') return r.contratada_id === usuarioId;
        return false;
      });
    
    case 'LancamentoFinanceiro':
      return registros.filter(r => {
        if (usuarioRole === 'admin' || usuarioRole === 'owner') return true;
        if (usuarioRole === 'gestor') return r.contrato?.gestor_id === usuarioId;
        if (usuarioRole === 'fiscal') return r.contrato?.fiscais?.some(f => f.fiscal_id === usuarioId);
        if (usuarioRole === 'terceirizado') return r.contrato?.contratada_id === usuarioId;
        return false;
      });
    
    case 'Reajuste':
      return registros.filter(r => {
        if (usuarioRole === 'admin' || usuarioRole === 'owner') return true;
        if (usuarioRole === 'gestor') return r.status === 'pendente_aprovacao';
        return false;
      });
    
    default:
      return registros;
  }
};

export default {
  filtroContratosPorUsuario,
  filtroLancamentosPorUsuario,
  filtroReajustesPorPermissao,
  aplicarRLS
};