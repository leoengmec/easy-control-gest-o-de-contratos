/**
 * Valida valor de lançamento
 * @param {number} valor - Valor a validar
 * @returns {Object} { valido, erro }
 */
export const validarValor = (valor) => {
  if (valor === undefined || valor === null) {
    return { valido: false, erro: 'Valor é obrigatório' };
  }
  
  if (typeof valor !== 'number') {
    return { valido: false, erro: 'Valor deve ser um número' };
  }
  
  if (valor < 0) {
    return { valido: false, erro: 'Valor não pode ser negativo' };
  }
  
  if (valor === 0) {
    return { valido: false, erro: 'Valor deve ser maior que zero' };
  }
  
  return { valido: true, erro: null };
};

/**
 * Valida data (não retroativa)
 * @param {Date|string} data - Data a validar
 * @returns {Object} { valido, erro }
 */
export const validarData = (data) => {
  if (!data) {
    return { valido: false, erro: 'Data é obrigatória' };
  }
  
  const dataObj = new Date(data);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  if (dataObj < hoje) {
    return { valido: false, erro: 'Data não pode ser retroativa' };
  }
  
  return { valido: true, erro: null };
};

/**
 * Valida limite de orçamento
 * @param {number} valorLancado - Valor já lançado
 * @param {number} novoValor - Novo valor a lançar
 * @param {number} limiteOrcamento - Limite do orçamento
 * @returns {Object} { valido, erro, percentualUsado, aviso }
 */
export const validarLimiteOrcamento = (valorLancado, novoValor, limiteOrcamento) => {
  const totalLancado = valorLancado + novoValor;
  const percentualUsado = (totalLancado / limiteOrcamento) * 100;
  
  if (totalLancado > limiteOrcamento) {
    return {
      valido: false,
      erro: `Lançamento excederia o limite de orçamento (${percentualUsado.toFixed(2)}%)`,
      percentualUsado
    };
  }
  
  if (percentualUsado > 80) {
    return {
      valido: true,
      erro: null,
      aviso: `Atenção: ${percentualUsado.toFixed(2)}% do orçamento será utilizado`,
      percentualUsado
    };
  }
  
  return { valido: true, erro: null, percentualUsado };
};

/**
 * Valida retenção (não pode ser maior que valor)
 * @param {number} valor - Valor do lançamento
 * @param {number} retencao - Valor da retenção
 * @returns {Object} { valido, erro }
 */
export const validarRetencao = (valor, retencao) => {
  if (retencao > valor) {
    return { valido: false, erro: 'Retenção não pode ser maior que o valor do lançamento' };
  }
  
  return { valido: true, erro: null };
};

/**
 * Valida glosa (não pode ser maior que valor)
 * @param {number} valor - Valor do lançamento
 * @param {number} glosa - Valor da glosa
 * @returns {Object} { valido, erro }
 */
export const validarGlosa = (valor, glosa) => {
  if (glosa > valor) {
    return { valido: false, erro: 'Glosa não pode ser maior que o valor do lançamento' };
  }
  
  return { valido: true, erro: null };
};

/**
 * Valida reajuste (percentual deve ser positivo e não absurdo)
 * @param {number} percentual - Percentual de reajuste
 * @returns {Object} { valido, erro }
 */
export const validarReajuste = (percentual) => {
  if (percentual === undefined || percentual === null) {
    return { valido: false, erro: 'Percentual de reajuste é obrigatório' };
  }
  
  if (percentual < 0) {
    return { valido: false, erro: 'Percentual não pode ser negativo' };
  }
  
  if (percentual > 50) {
    return { valido: false, erro: 'Percentual de reajuste não pode ser maior que 50%' };
  }
  
  return { valido: true, erro: null };
};

export default {
  validarValor,
  validarData,
  validarLimiteOrcamento,
  validarRetencao,
  validarGlosa,
  validarReajuste
};