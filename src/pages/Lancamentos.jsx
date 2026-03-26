import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js para ambiente web
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Lancamentos = () => {
  // Estado principal do formulário - Mantém os campos editáveis
  const [formData, setFormData] = useState({
    numero_nf: '',
    data_emissao: '',
    valor_total_nf: 0,
    numero_os: '',
    itens: []
  });

  // Estado para controle do valor previsto da OS (para validação)
  const [valorPrevistoOS, setValorPrevistoOS] = useState(0);

  // --- Lógica de Processamento de Dados ---

  const extrairValorDaLinha = (linha) => {
    const match = linha.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    return match ? parseFloat(match[0].replace('.', '').replace(',', '.')) : 0;
  };

  const processarItensEAgrupamento = (textoBruto) => {
    const linhas = textoBruto.split('\n');
    const itensFinais = [];
    let somaNatal = 0;
    let somaMossoro = 0;
    const cargosMor = ["AUXILIAR", "ARTIFICE", "ENGENHEIRO"];

    linhas.forEach(linha => {
      const desc = linha.toUpperCase();

      // Regra de Inatividade
      if (desc.includes("AUXILIAR ADMINISTRATIVO NATAL")) return;

      // Agrupamento MOR Natal
      if (cargosMor.some(cargo => desc.includes(cargo)) && desc.includes("NATAL")) {
        somaNatal += extrairValorDaLinha(linha);
        return;
      }

      // Agrupamento MOR Mossoró
      if (cargosMor.some(cargo => desc.includes(cargo)) && desc.includes("MOSSORÓ")) {
        somaMossoro += extrairValorDaLinha(linha);
        return;
      }

      // Itens Avulsos (Materiais/Outros)
      if (desc.includes("VALOR") || linha.trim().length < 10) return;
      
      itensFinais.push({
        descricao: linha.substring(0, 60).trim(),
        valorTotal: extrairValorDaLinha(linha),
        quantidade: 1, // Valor padrão para edição posterior
        unidade: 'UN'
      });
    });

    if (somaNatal > 0) itensFinais.push({ descricao: "MOR NATAL", valorTotal: somaNatal });
    if (somaMossoro > 0) itensFinais.push({ descricao: "MOR MOSSORÓ", valorTotal: somaMossoro });

    return itensFinais;
  };

  // --- Handlers Automáticos (Extração ao selecionar arquivo) ---

  const handleFileChange = async (event, tipoDoc) => {
    const file = event.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(s => s.str).join(" ") + "\n";
    }

    if (tipoDoc === 'OS') {
      const vPrevistoMatch = text.match(/(?:TOTAL:?)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      const valorNum = vPrevistoMatch ? parseFloat(vPrevistoMatch[1].replace('.', '').replace(',', '.')) : 0;
      
      setValorPrevistoOS(valorNum);
      setFormData(prev => ({ 
        ...prev, 
        numero_os: text.match(/(\d{3}[\.\/]\d{4}-[A-Z]{2})/)?.[0] || '' 
      }));

    } else {
      const numNF = text.match(/(?:N°\.\s?|Número\s?)(\d+)/i)?.[1];
      const dataNF = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[0];
      const vTotalMatch = text.match(/(?:VALOR TOTAL DA NOTA|TOTAL:?)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      const vTotalNum = vTotalMatch ? parseFloat(vTotalMatch[1].replace('.', '').replace(',', '.')) : 0;

      setFormData(prev => ({
        ...prev,
        numero_nf: numNF || '',
        data_emissao: dataNF || '',
        valor_total_nf: vTotalNum,
        itens: processarItensEAgrupamento(text)
      }));
    }
  };

  // --- Função de Salvamento com Alerta ---

  const validarESalvar = () => {
    const diferenca = formData.valor_total_nf - valorPrevistoOS;

    if (formData.valor_total_nf > valorPrevistoOS && valorPrevistoOS > 0) {
      const msg = `Atenção: O valor desta NF (R$ ${formData.valor_total_nf.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) excede o valor previsto na OS (R$ ${valorPrevistoOS.toLocaleString('pt-BR', {minimumFractionDigits: 2})}).\n\nA diferença é de R$ ${diferenca.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.\n\nDeseja prosseguir com o lançamento?`;
      
      if (window.confirm(msg)) {
        console.log("Enviando dados para Base44:", formData);
        // Aqui você chamaria a função de integração com o Base44
      }
    } else {
      console.log("Enviando dados para Base44:", formData);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold border-b pb-2">Fiscalização JFRN - Lançamento</h1>
      
      {/* Slots de Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded shadow-sm bg-gray-50">
          <label className="block text-sm font-medium mb-2">Upload da OS (Previsão)</label>
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'OS')} className="w-full text-sm" />
        </div>
        <div className="p-4 border rounded shadow-sm bg-gray-50">
          <label className="block text-sm font-medium mb-2">Upload da NF (Execução)</label>
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'NF')} className="w-full text-sm" />
        </div>
      </div>

      {/* Formulário Editável */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 border rounded">
        <div>
          <label className="block text-xs text-gray-500 uppercase">Número NF</label>
          <input 
            type="text"
            value={formData.numero_nf}
            onChange={(e) => setFormData({...formData, numero_nf: e.target.value})}
            className="w-full border-b focus:border-blue-500 outline-none py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase">Data Emissão</label>
          <input 
            type="text"
            value={formData.data_emissao}
            onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
            className="w-full border-b focus:border-blue-500 outline-none py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase">OS Vinculada</label>
          <input 
            type="text"
            value={formData.numero_os}
            onChange={(e) => setFormData({...formData, numero_os: e.target.value})}
            className="w-full border-b focus:border-blue-500 outline-none py-1"
          />
        </div>
      </div>

      {/* Tabela de Itens Agrupados/Individuais */}
      <div className="border rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border-b">Descrição</th>
              <th className="p-2 border-b text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {formData.itens.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-2 border-b">{item.descricao}</td>
                <td className="p-2 border-b text-right">R$ {item.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            {formData.itens.length === 0 && (
              <tr><td colSpan="2" className="p-4 text-center text-gray-400">Nenhum item extraído ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-blue-50 p-4 rounded border border-blue-100">
        <div>
          <p className="text-xs text-blue-700 uppercase font-bold">Resumo Financeiro</p>
          <p className="text-lg font-bold">Total NF: R$ {formData.valor_total_nf.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <button 
          onClick={validarESalvar}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow"
        >
          Confirmar Lançamento
        </button>
      </div>
    </div>
  );
};

export default Lancamentos;