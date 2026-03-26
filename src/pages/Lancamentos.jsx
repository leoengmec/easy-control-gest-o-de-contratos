// Função auxiliar para processar Aglutinadores MOR e Itens
const processarItensEAgrupamento = (textoBruto, tipoNF) => {
  // Se for NF de Material, extraímos a tabela (Simulação da lógica de colunas)
  // Se for NF de Serviço, aplicamos a regra dos Aglutinadores MOR
  
  const linhas = textoBruto.split('\n');
  const itensFinais = [];
  let somaNatal = 0;
  let somaMossoro = 0;

  const cargosMor = ["AUXILIAR", "ARTIFICE", "ENGENHEIRO"];

  // Percorre o texto para identificar padrões
  linhas.forEach(linha => {
    const desc = linha.toUpperCase();

    // 1. Regra de Inatividade: Ignora Auxiliar Administrativo Natal
    if (desc.includes("AUXILIAR ADMINISTRATIVO NATAL")) return;

    // 2. Agrupamento MOR Natal
    if (cargosMor.some(cargo => desc.includes(cargo)) && desc.includes("NATAL")) {
      const valor = extrairValorDaLinha(linha);
      somaNatal += valor;
      return;
    }

    // 3. Agrupamento MOR Mossoró
    if (cargosMor.some(cargo => desc.includes(cargo)) && desc.includes("MOSSORÓ")) {
      const valor = extrairValorDaLinha(linha);
      somaMossoro += valor;
      return;
    }

    // 4. Itens Individuais (Materiais ou outros serviços)
    // Aqui entra a lógica de capturar Descrição, Qtd, Unid, Valor Unit e Total
    // Exemplo simplificado para manter a estrutura editável:
    if (desc.includes("VALOR") || desc.length < 5) return; 
    itensFinais.push(mapearLinhaParaObjeto(linha));
  });

  // Adiciona os aglutinadores se houver valor
  if (somaNatal > 0) itensFinais.push({ descricao: "MOR NATAL", valorTotal: somaNatal, editavel: true });
  if (somaMossoro > 0) itensFinais.push({ descricao: "MOR MOSSORÓ", valorTotal: somaMossoro, editavel: true });

  return itensFinais;
};

// GATILHO AUTOMÁTICO (Sem botão)
const handleFileChange = async (event, tipoDoc) => {
  const file = event.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(s => s.str).join(" ") + "\n";
  }

  if (tipoDoc === 'OS') {
    // Extrai valor previsto da OS
    const vPrevisto = text.match(/(?:TOTAL:?)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1];
    const valorNum = parseFloat(vPrevisto?.replace('.', '').replace(',', '.') || 0);
    
    // Seta no estado para comparação posterior
    setValorPrevistoOS(valorNum);
    // Preenche campo número da OS (Editável)
    setFormData(prev => ({ ...prev, numero_os: text.match(/(\d{3}\/\d{4}-[A-Z]{2})/)?.[0] || '' }));

  } else {
    // Extrai dados da NF
    const numNF = text.match(/(?:N°\.\s?|Número\s?)(\d+)/i)?.[1];
    const dataNF = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[0];
    const vTotal = text.match(/(?:VALOR TOTAL DA NOTA|TOTAL:?)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1];
    const vTotalNum = parseFloat(vTotal?.replace('.', '').replace(',', '.') || 0);

    // Preenche o formulário (Mantendo tudo editável nos inputs)
    setFormData(prev => ({
      ...prev,
      numero_nf: numNF || '',
      data_emissao: dataNF || '',
      valor_total_nf: vTotalNum,
      itens: processarItensEAgrupamento(text)
    }));
  }
};

// VALIDAÇÃO NO CLIQUE DE SALVAR
const validarESalvar = () => {
  const diferenca = formData.valor_total_nf - valorPrevistoOS;

  if (formData.valor_total_nf > valorPrevistoOS && valorPrevistoOS > 0) {
    const msg = `Atenção: O valor desta NF (R$ ${formData.valor_total_nf.toFixed(2)}) excede o valor previsto na OS (R$ ${valorPrevistoOS.toFixed(2)}). A diferença é de R$ ${diferenca.toFixed(2)}. Deseja prosseguir com o lançamento?`;
    
    if (window.confirm(msg)) {
      executarEnvioBase44();
    }
  } else {
    executarEnvioBase44();
  }
};