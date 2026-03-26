import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js (Necessário para funcionar no navegador)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Lancamentos = () => {
  // Estados para manter os dados editáveis
  const [formData, setFormData] = useState({
    numero_nf: '',
    data_emissao: '',
    valor_total_nf: 0,
    numero_os: '',
    itens: []
  });
  const [valorPrevistoOS, setValorPrevistoOS] = useState(0);

  // --- Funções Auxiliares de Extração ---
  
  const extrairValorDaLinha = (linha) => {
    const match = linha.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    return match ? parseFloat(match[0].replace('.', '').replace(',', '.')) : 0;
  };

  const mapearLinhaParaObjeto = (linha) => {
    // Tenta capturar descrição e valor básico da linha
    return {
      descricao: linha.substring(0, 50).trim(),
      valorTotal: extrairValorDaLinha(linha),
      editavel: true
    };
  };

  const processarItensEAgrupamento = (textoBruto) => {
    const linhas = textoBruto.split('\n');
    const itensFinais = [];
    let somaNatal = 0;
    let somaMossoro = 0;
    const cargosMor = ["AUXILIAR", "ARTIFICE", "ENGENHEIRO"];

    linhas.forEach(linha => {
      const desc = linha.toUpperCase();
      if (desc.includes("AUXILIAR ADMINISTRATIVO NATAL")) return;

      if (cargosMor.some(cargo => desc.includes(cargo)) && desc.includes("NATAL")) {
        somaNatal += extrairValorDaLinha(linha);
        return;
      }
      if (cargosMor.some(cargo => desc.includes(cargo)) && desc.includes("MOSSORÓ")) {
        somaMossoro += extrairValorDaLinha(linha);
        return;
      }
      if (desc.includes("VALOR") || linha.trim().length < 10) return; 
      itensFinais.push(mapearLinhaParaObjeto(linha));
    });

    if (somaNatal > 0) itensFinais.push({ descricao: "MOR NATAL", valorTotal: somaNatal, editavel: true });
    if (somaMossoro > 0) itensFinais.push({ descricao: "MOR MOSSORÓ", valorTotal: somaMossoro, editavel: true });

    return itensFinais;
  };

  // --- Handlers de Eventos ---

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
      const vPrevisto = text.match(/(?:TOTAL:?)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1];
      const valorNum = parseFloat(vPrevisto?.replace('.', '').replace(',', '.') || 0);
      setValorPrevistoOS(valorNum);
      setFormData(prev => ({ ...prev, numero_os: text.match(/(\d{3}\/\d{4}-[A-Z]{2})/)?.[0] || '' }));
    } else {
      const numNF = text.match(/(?:N°\.\s?|Número\s?)(\d+)/i)?.[1];
      const dataNF = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[0];
      const vTotal = text.match(/(?:VALOR TOTAL DA NOTA|TOTAL:?)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1];
      const vTotalNum = parseFloat(vTotal?.replace('.', '').replace(',', '.') || 0);

      setFormData(prev => ({
        ...prev,
        numero_nf: numNF || '',
        data_emissao: dataNF || '',
        valor_total_nf: vTotalNum,
        itens: processarItensEAgrupamento(text)
      }));
    }
  };

  const validarESalvar = () => {
    const diferenca = formData.valor_total_nf - valorPrevistoOS;
    if (formData.valor_total_nf > valorPrevistoOS && valorPrevistoOS > 0) {
      const msg = `Atenção: O valor desta NF (R$ ${formData.valor_total_nf.toFixed(2)}) excede o valor previsto na OS (R$ ${valorPrevistoOS.toFixed(2)}). A diferença é de R$ ${diferenca.toFixed(2)}. Deseja prosseguir com o lançamento?`;
      if (window.confirm(msg)) {
        console.log("Salvando no Base44...", formData);
      }
    } else {
      console.log("Salvando no Base44...", formData);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Lançamento de Nota Fiscal e OS</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-2">Anexar OS:</label>
          <input type="file" onChange={(e) => handleFileChange(e, 'OS')} className="border p-2 w-full" />
        </div>
        <div>
          <label className="block mb-2">Anexar NF:</label>
          <input type="file" onChange={(e) => handleFileChange(e, 'NF')} className="border p-2 w-full" />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <input 
          value={formData.numero_nf} 
          onChange={(e) => setFormData({...formData, numero_nf: e.target.value})}
          placeholder="Número da NF" className="border p-2 mr-2" 
        />
        <input 
          value={formData.data_emissao} 
          onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
          placeholder="Data de Emissão" className="border p-2" 
        />
        <p className="mt-2 font-semibold">Valor Total NF: R$ {formData.valor_total_nf.toFixed(2)}</p>
      </div>

      <button 
        onClick={validarESalvar}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Salvar Lançamento
      </button>
    </div>
  );
};

// ESSA LINHA É A QUE RESOLVE O SEU ERRO DE SYNTAX:
export default Lancamentos;