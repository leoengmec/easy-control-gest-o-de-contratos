import { useCallback } from 'react';

export function useCalcularReajuste() {
  const calcular = useCallback((valorAtual, percentualReajuste, indiceAplicado) => {
    if (!valorAtual || !percentualReajuste) {
      return { 
        valor_anterior: valorAtual || 0, 
        novo_valor: valorAtual || 0, 
        percentual_reajuste: 0,
        indice_aplicado: indiceAplicado
      };
    }

    const fator = 1 + (percentualReajuste / 100);
    const novoValor = valorAtual * fator;

    return {
      valor_anterior: valorAtual,
      novo_valor: parseFloat(novoValor.toFixed(2)),
      percentual_reajuste: percentualReajuste,
      indice_aplicado: indiceAplicado
    };
  }, []);

  return { calcular };
}