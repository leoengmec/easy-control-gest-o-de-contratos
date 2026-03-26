import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker para o funcionamento do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Lancamentos = () => {
  const [formData, setFormData] = useState({
    numero_nf: '',
    data_emissao: '',
    valor_total_nf: 0,
    numero_os: '',
    itens: []
  });

  const [checkboxes, setCheckboxes] = useState({
    mor_natal: false,
    mor_mossoro: false,
    fornecimento_material: false,
    servicos_deslocamento: false
  });

  const [valorPrevistoOS, setValorPrevistoOS] = useState(0);

  // --- LÓGICA DE EXTRAÇÃO E REGRAS DE NEGÓCIO ---

  const extrairValor = (texto) => {
    if (!texto) return 0;
    const match = texto.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    return match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : 0;
  };

  const handleExtrairNF = async () => {
    const fileInput = document.getElementById('nf-upload');
    const file = fileInput?.files[0];
    if (!file) {
      alert("Por favor, selecione um arquivo de NF primeiro.");
      return;
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(s => s.str).join(" ") + "\n";
    }

    const txtUpper = fullText.toUpperCase();
    const isNFe = txtUpper.includes("DANFE") || txtUpper.includes("NF-E") || txtUpper.includes("VENDA DE MATERIAL");
    
    let numNf = "";
    let valorTotal = 0;

    if (isNFe) {
      const nfMatch = fullText.match(/(?:N°\.\s?)(\d{3}\.\d{3}\.\d{3})/i);
      if (nfMatch) numNf = nfMatch[1];
      
      const valorMatch = fullText.match(/(?:VALOR TOTAL DA NOTA|VALOR TOTAL)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (valorMatch) valorTotal = extrairValor(valorMatch[1]);
    } else {
      const nfMatch = fullText.match(/Número da NFS-e[\s\S]*?(\d+)/i);
      if (nfMatch) numNf = nfMatch[1];

      const valorMatch = fullText.match(/(?:Valor do Serviço|VALOR TOTAL DA NFS-E)[\s\S]*?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (valorMatch) valorTotal = extrairValor(valorMatch[1]);
    }

    const dataMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const osMatch = fullText.match(/(\d{3}[\.\/]\d{4}-[A-Z]{2}|\d{3}\.\d{4})/i);

    const ignoreAuxAdm = txtUpper.includes("AUXILIAR ADMINISTRATIVO NATAL");
    const hasMorKeywords = txtUpper.includes("MÃO DE OBRA") || txtUpper.includes("ARTIFICE") || txtUpper.includes("AUXILIAR");
    
    const morNatal = !ignoreAuxAdm && hasMorKeywords && txtUpper.includes("NATAL");
    const morMossoro = hasMorKeywords && txtUpper.includes("MOSSORÓ");
    const fornecimento = txtUpper.includes("DANFE") || txtUpper.includes("VENDA DE MATERIAL");
    const deslocamento = txtUpper.includes("DESLOCAMENTO") || txtUpper.includes("VISITA TÉCNICA");

    setCheckboxes({
      mor_natal: morNatal,
      mor_mossoro: morMossoro,
      fornecimento_material: fornecimento,
      servicos_deslocamento: deslocamento
    });

    setFormData(prev => ({
      ...prev,
      numero_nf: numNf || prev.numero_nf,
      data_emissao: dataMatch ? dataMatch[1] : prev.data_emissao,
      valor_total_nf: valorTotal || prev.valor_total_nf,
      numero_os: osMatch ? osMatch[1] : prev.numero_os
    }));
  };

  const handleFileChange = async (event, tipoDoc) => {
    const file = event.target.files[0];
    if (!file || tipoDoc !== 'OS') return; // NF is handled by handleExtrairNF now

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(s => s.str).join(" ") + "\n";
    }

    const vPrev = extrairValor(fullText.split("TOTAL")[1] || fullText);
    setValorPrevistoOS(vPrev);
    const osMatch = fullText.match(/(\d{3}[\.\/]\d{4}-[A-Z]{2}|\d{3}\.\d{4})/i);
    setFormData(prev => ({ ...prev, numero_os: osMatch ? osMatch[1] : prev.numero_os }));
  };

  const validarESalvar = () => {
    const diferenca = formData.valor_total_nf - valorPrevistoOS;
    if (formData.valor_total_nf > valorPrevistoOS && valorPrevistoOS > 0) {
      const msg = `Atenção: O valor desta NF (R$ ${formData.valor_total_nf.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) excede o valor previsto na OS (R$ ${valorPrevistoOS.toLocaleString('pt-BR', {minimumFractionDigits: 2})}). A diferença é de R$ ${diferenca.toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Deseja prosseguir com o lançamento?`;
      if (!window.confirm(msg)) return;
    }
    console.log("Salvando...", formData, checkboxes);
    // Adicione aqui sua chamada para o Base44
  };

  // --- SEU LAYOUT ORIGINAL ABAIXO ---

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold border-b pb-2">Fiscalização JFRN - Lançamento</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded shadow-sm bg-gray-50">
          <label className="block text-sm font-medium mb-2">Upload da OS (Previsão)</label>
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'OS')} className="w-full text-sm" />
        </div>
        <div className="p-4 border rounded shadow-sm bg-gray-50">
          <label className="block text-sm font-medium mb-2">Upload da NF (Execução)</label>
          <input id="nf-upload" type="file" accept=".pdf" className="w-full text-sm mb-2" />
          <button onClick={handleExtrairNF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-bold transition-colors">
            Importar PDF da NF
          </button>
        </div>
      </div>

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

      <div className="bg-white p-4 border rounded">
        <label className="block text-xs text-gray-500 uppercase mb-3">Itens Identificados Automaticamente</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={checkboxes.mor_natal} onChange={(e) => setCheckboxes({...checkboxes, mor_natal: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>MOR Natal</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={checkboxes.mor_mossoro} onChange={(e) => setCheckboxes({...checkboxes, mor_mossoro: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>MOR Mossoró</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={checkboxes.fornecimento_material} onChange={(e) => setCheckboxes({...checkboxes, fornecimento_material: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>Material</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={checkboxes.servicos_deslocamento} onChange={(e) => setCheckboxes({...checkboxes, servicos_deslocamento: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>Deslocamento</span>
          </label>
        </div>
      </div>

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