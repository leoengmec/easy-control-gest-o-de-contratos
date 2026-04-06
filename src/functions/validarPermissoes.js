export const validarPermissoes = (userRole, acao, recurso) => {
  const permissoes = {
    admin: ['criar', 'editar', 'deletar', 'visualizar', 'aprovar', 'rejeitar'],
    owner: ['criar', 'editar', 'deletar', 'visualizar', 'aprovar', 'rejeitar'],
    gestor: ['criar', 'editar', 'visualizar', 'aprovar'],
    fiscal: ['visualizar', 'lançar_medição', 'gerenciar_materiais'],
    direcao: ['visualizar'],
    terceirizado: ['visualizar_saldos', 'inserir_pedidos_materiais'],
    estagiario: ['visualizar', 'lançar_medição', 'pesquisa_preços']
  };
  
  const acoesPermitidas = permissoes[userRole] || [];
  
  if (!acoesPermitidas.includes(acao)) {
    throw new Error(`Usuário com role '${userRole}' não tem permissão para '${acao}' em '${recurso}'`);
  }
  
  return true;
};

export default validarPermissoes;