/**
 * Calcula valor pró-rata para primeiro ano de contrato
 * @param {Date} dataInicio - Data de início do contrato
 * @param {Date} dataFim - Data de fim do contrato
 * @param {number} valorAnual - Valor anual do item
 * @param {number} quantidade - Quantidade contratada
 * @returns {Object} { valor_prorrata, diasRestantes }
 */
export const calcularProRata = (dataInicio, dataFim, valorAnual, quantidade = 1) => {
  try {
    // Se data_inicio = 01/01, retornar valor_anual normal
    if (dataInicio.getDate() === 1 && dataInicio.getMonth() === 0) {
      return {
        valor_prorrata: valorAnual * quantidade,
        diasRestantes: 365,
        eh_prorrata: false
      };
    }
    
    // Calcular dias restantes até 31/12 do primeiro ano
    const ultimoDiaAno = new Date(dataInicio.getFullYear(), 11, 31);
    const diasRestantes = Math.floor((ultimoDiaAno - dataInicio) / (1000 * 60 * 60 * 24)) + 1;
    const diasTotaisAno = 365;
    
    // Valor pró-rata = (valor_anual / 365) × dias_restantes
    const valorProrrata = (valorAnual / diasTotaisAno) * diasRestantes * quantidade;
    
    return {
      valor_prorrata: parseFloat(valorProrrata.toFixed(2)),
      diasRestantes: diasRestantes,
      eh_prorrata: true
    };
  } catch (error) {
    console.error('Erro ao calcular pró-rata:', error);
    throw new Error(`Erro ao calcular pró-rata: ${error.message}`);
  }
};

/**
 * Calcula retenção mensal da conta vinculada baseado em postos de trabalho
 * @param {Array} postosTrabalhoDados - Array de postos com remuneração
 * @returns {Object} Totais de retenção (13º, férias, FGTS, etc.)
 */
export const calcularRetencaoMensal = (postosTrabalhoDados) => {
  try {
    // Percentuais fixos (podem ser alterados via ConfiguracaoSistema)
    const PERCENTUAL_13_SALARIO = 0.0909090909;
    const PERCENTUAL_FERIAS = 0.0909090909;
    const PERCENTUAL_1_3_FERIAS = 0.0303030303;
    const PERCENTUAL_GRUPO_A = 0.0781;
    const PERCENTUAL_MULTA_FGTS = 0.0349;
    
    let totalRemuneracao = 0;
    let total13Salario = 0;
    let totalFerias = 0;
    let total1_3Ferias = 0;
    let totalSubtotalVerbas = 0;
    let totalGrupoA = 0;
    let totalMultaFGTS = 0;
    let totalReter = 0;
    
    postosTrabalhoDados.forEach(posto => {
      const subtotalRemuneracao = posto.quantidade_empregados * posto.remuneracao_mensal;
      const valor13Salario = subtotalRemuneracao * PERCENTUAL_13_SALARIO;
      const valorFerias = subtotalRemuneracao * PERCENTUAL_FERIAS;
      const valor1_3Ferias = subtotalRemuneracao * PERCENTUAL_1_3_FERIAS;
      const subtotalVerbas = valor13Salario + valorFerias + valor1_3Ferias;
      const valorGrupoA = subtotalVerbas * PERCENTUAL_GRUPO_A;
      const valorMultaFGTS = subtotalVerbas * PERCENTUAL_MULTA_FGTS;
      const valorReterTotal = subtotalVerbas + valorGrupoA + valorMultaFGTS;
      
      totalRemuneracao += subtotalRemuneracao;
      total13Salario += valor13Salario;
      totalFerias += valorFerias;
      total1_3Ferias += valor1_3Ferias;
      totalSubtotalVerbas += subtotalVerbas;
      totalGrupoA += valorGrupoA;
      totalMultaFGTS += valorMultaFGTS;
      totalReter += valorReterTotal;
    });
    
    return {
      remuneracao_total: parseFloat(totalRemuneracao.toFixed(2)),
      valor_13_salario: parseFloat(total13Salario.toFixed(2)),
      valor_ferias: parseFloat(totalFerias.toFixed(2)),
      valor_1_3_ferias: parseFloat(total1_3Ferias.toFixed(2)),
      subtotal_provisao: parseFloat(totalSubtotalVerbas.toFixed(2)),
      valor_grupo_a: parseFloat(totalGrupoA.toFixed(2)),
      valor_multa_fgts: parseFloat(totalMultaFGTS.toFixed(2)),
      total_reter: parseFloat(totalReter.toFixed(2))
    };
  } catch (error) {
    console.error('Erro ao calcular retenção mensal:', error);
    throw new Error(`Erro ao calcular retenção mensal: ${error.message}`);
  }
};

/**
 * Calcula novo valor após reajuste
 * @param {number} valorAnterior - Valor antes do reajuste
 * @param {number} percentualReajuste - Percentual de reajuste (%)
 * @param {string} tipo - Tipo de reajuste (convenção_coletiva, incc, ipca)
 * @returns {Object} Cálculo do reajuste
 */
export const calcularReajuste = (valorAnterior, percentualReajuste, tipo = 'generico') => {
  try {
    const novoValor = valorAnterior * (1 + percentualReajuste / 100);
    const diferenca = novoValor - valorAnterior;
    
    return {
      valor_anterior: parseFloat(valorAnterior.toFixed(2)),
      novo_valor: parseFloat(novoValor.toFixed(2)),
      diferenca: parseFloat(diferenca.toFixed(2)),
      percentual_reajuste: percentualReajuste,
      tipo: tipo,
      data_calculo: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao calcular reajuste:', error);
    throw new Error(`Erro ao calcular reajuste: ${error.message}`);
  }
};

export default {
  calcularProRata,
  calcularRetencaoMensal,
  calcularReajuste
};