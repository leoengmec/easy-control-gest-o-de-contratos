import { calcularProRata } from '@/utils/calculos';

export const useCalcularProRata = (dataInicio, dataFim, valorAnual, quantidade = 1) => {
  const calcular = () => {
    return calcularProRata(dataInicio, dataFim, valorAnual, quantidade);
  };
  
  return { calcular };
};