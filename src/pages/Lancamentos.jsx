// 📄 Motor de Extração de PDF (Versão Refinada para JFRN)
  const handlePDF = async (file) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(s => s.str).join(" ");
        }

        // EXIBE NO CONSOLE PARA DEBUG (F12 no navegador para ver)
        console.log("TEXTO EXTRAÍDO DO PDF:", text);

        // REGEX CALIBRADO (Mais abrangente para NF e Valor)
        const nf = text.match(/(?:Número|NF|Nota|Nº)\s*[:\-\s]*(\d+)/i)?.[1] || "";
        const data = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
        
        // Busca Valor após o cifrão ou termos de total
        const valorMatch = text.match(/(?:TOTAL|VALOR|R\$)\s*[:\-\s]*([\d\.,]+)/i);
        
        // OS - Pega apenas os primeiros 15 caracteres após o termo OS
        const osMatch = text.match(/(?:OS|Ordem de Serviço)[:\-\s]*([A-Z0-9\-\/]{3,15})/i);

        setDados({
          ...dados,
          numero_nf: nf,
          data_nf: data || "01/01/2026",
          os_numero: osMatch ? osMatch[1].trim() : "",
          valor_total: valorMatch ? parseFloat(valorMatch[1].replace(".", "").replace(",", ".")) * 100 : 0,
          descricao: text.substring(0, 150)
        });
        toast.success("Leitura concluída! Verifique os campos.");
      } catch (e) { 
        toast.error("Erro técnico na leitura do PDF."); 
      } finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const salvar = async () => {
    // 🚨 SEGURANÇA: Impede salvar se o contrato não foi selecionado no Select do Modal
    if (!contratoId) {
      toast.error("Por favor, selecione o contrato acima do campo de upload.");
      return;
    }

    try {
      setLoading(true);
      
      // Tratamento de data robusto
      let dataISO;
      try {
        const parts = dados.data_nf.split("/");
        dataISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } catch (e) {
        dataISO = new Date().toISOString().split('T')[0];
      }

      // 1. Grava no Financeiro
      const novoLancamento = await base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoId,
        valor: dados.valor_total / 100,
        numero_nf: String(dados.numero_nf),
        data_nf: dataISO,
        status: "Em instrução",
        responsavel_por_lancamento: user?.nome || "Leonardo"
      });

      // 2. Grava no Controle de Materiais (ItemMaterialNF)
      await base44.entities.ItemMaterialNF.create({
        lancamento_financeiro_id: novoLancamento.id,
        contrato_id: contratoId,
        numero_nf: String(dados.numero_nf),
        data_nf: dataISO,
        os_numero: dados.os_numero,
        descricao: dados.descricao || "Lançamento via PDF",
        valor_total_nota: dados.valor_total / 100,
        quantidade: 1,
        unidade: "UN"
      });

      toast.success("✅ Tudo pronto! Lançamento registrado.");
      setIsModalOpen(false); // FECHA O MODAL
      
    } catch (err) {
      console.error("ERRO CRÍTICO NO SAVE:", err);
      toast.error(`Erro ao salvar: ${err.message || 'Verifique se todos os campos estão preenchidos'}`);
    } finally {
      setLoading(false);
    }
  };