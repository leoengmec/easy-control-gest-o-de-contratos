import { useCallback } from 'react';
import { differenceInDays, getDaysInMonth } from 'date-fns';

export function useCalcularProRata() {
  const calcularProRata = useCallback((valorMensal, dataInicio, dataFim) => {
    if (!valorMensal || !dataInicio || !dataFim) return 0;
    
    const start = new Date(dataInicio);
    const end = new Date(dataFim);
    
    const daysInMonth = getDaysInMonth(start);
    // Adiciona 1 para tornar a contagem inclusiva
    const diffDays = differenceInDays(end, start) + 1; 
    
    if (diffDays >= daysInMonth) return valorMensal;
    
    return (valorMensal / daysInMonth) * diffDays;
  }, []);

  return { calcularProRata };
}