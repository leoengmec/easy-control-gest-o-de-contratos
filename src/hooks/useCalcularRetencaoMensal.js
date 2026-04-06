import { useCallback } from 'react';

export function useCalcularRetencaoMensal() {
  const calcular = useCallback((postos) => {
    if (!postos || postos.length === 0) {
      return {
        remuneracao_total: 0,
        valor_13_salario: 0,
        valor_ferias: 0,
        valor_1_3_ferias: 0,
        subtotal_provisao: 0,
        valor_grupo_a: 0,
        valor_multa_fgts: 0,
        total_reter: 0
      };
    }

    let remuneracao_total = 0;
    postos.forEach(posto => {
      remuneracao_total += (posto.salario_base || 0);
    });

    // Percentuais baseados em métricas padrão de retenção de contratos
    const valor_13_salario = remuneracao_total * 0.0833;
    const valor_ferias = remuneracao_total * 0.0833;
    const valor_1_3_ferias = valor_ferias / 3;
    const subtotal_provisao = valor_13_salario + valor_ferias + valor_1_3_ferias;
    
    const valor_grupo_a = remuneracao_total * 0.04; 
    const valor_multa_fgts = remuneracao_total * 0.04; 

    const total_reter = subtotal_provisao + valor_grupo_a + valor_multa_fgts;

    return {
      remuneracao_total,
      valor_13_salario,
      valor_ferias,
      valor_1_3_ferias,
      subtotal_provisao,
      valor_grupo_a,
      valor_multa_fgts,
      total_reter
    };
  }, []);

  return { calcular };
}