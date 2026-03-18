const executeSave = async () => {
    setSaving(true);

    const baseData = {
      contrato_id: contratoId,
      ano: parseInt(ano),
      mes: parseInt(mes),
      status,
      processo_pagamento_sei: processoPagSei,
      ordem_bancaria: ordemBancaria,
      ordens_servico: ordensServico
        .filter(os => os.numero || os.descricao)
        .map(os => ({
          ...os,
          valor: os.valor ? parseFloat(os.valor) : null,
          data_emissao: os.data_emissao || hoje,
          data_execucao: os.data_execucao || ""
        })),
      data_lancamento: dataLancamento,
      observacoes,
    };

    try {
      // 1. Processar cancelamentos (Um por um)
      for (const lancId of pendingCancellations) {
        const lanc = lancamentosExistentes.find(l => l.id === lancId);
        if (lanc) {
          await base44.entities.LancamentoFinanceiro.update(lancId, {
            status: "Cancelado",
            valor_pago_final: 0,
          });

          await base44.entities.HistoricoLancamento.create({
            lancamento_financeiro_id: lancId,
            tipo_acao: "cancelamento",
            status_anterior: lanc.status,
            status_novo: "Cancelado",
            motivo: cancelJustificativa,
            realizado_por: user?.full_name || user?.email || "Sistema",
            realizado_por_id: user?.id || "",
            data_acao: hoje,
          });
          // Pequena pausa para evitar 429
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // 2. Criar ou atualizar lançamentos
      for (const entry of itensLancamento) {
        const valor = parseFloat(entry.valor) || 0;
        const retencao = parseFloat(entry.retencao) || 0;
        const glosa = parseFloat(entry.glosa) || 0;

        let currentLancId = entry.lancamento_id;

        if (currentLancId) {
          // Atualizar existente
          await base44.entities.LancamentoFinanceiro.update(currentLancId, {
            ...baseData,
            valor,
            retencao,
            glosa,
            valor_pago_final: valor - retencao - glosa,
            item_label: entry.item_label,
            item_contrato_id: entry.item_contrato_id,
            nota_empenho_id: entry.nota_empenho_id,
            numero_nf: entry.numero_nf,
            data_nf: entry.data_nf,
          });
        } else {
          // Criar novo
          const created = await base44.entities.LancamentoFinanceiro.create({
            ...baseData,
            valor,
            retencao,
            glosa,
            valor_pago_final: valor - retencao - glosa,
            item_label: entry.item_label,
            item_contrato_id: entry.item_contrato_id,
            nota_empenho_id: entry.nota_empenho_id,
            numero_nf: entry.numero_nf,
            data_nf: entry.data_nf,
          });
          currentLancId = created.id;

          // Registrar histórico de criação
          await base44.entities.HistoricoLancamento.create({
            lancamento_financeiro_id: currentLancId,
            tipo_acao: "criacao",
            status_novo: status,
            motivo: "Lançamento criado",
            realizado_por: user?.full_name || user?.email || "Sistema",
            realizado_por_id: user?.id || "",
            data_acao: hoje,
          });

          if (retencao > 0) {
            await base44.entities.HistoricoRetencao.create({
              lancamento_financeiro_id: currentLancId,
              valor_retido: retencao,
              valor_cancelado: 0,
              data_acao: hoje,
              tipo_acao: "aplicada",
            });
          }
        }

        // 3. SE FOR MATERIAL: Salvar itens extraídos da NF vinculados a ESTE lançamento
        const itemConfig = itensContratoAtivos.find(ic => ic.id === entry.item_contrato_id);
        const isMaterial = itemConfig?.grupo_servico === "material" || entry.item_label?.toUpperCase().includes("MATERIAL");

        if (isMaterial && itensMaterialExtraidos.length > 0) {
          toast.info(`Salvando ${itensMaterialExtraidos.length} itens de material...`);
          
          for (const itemMat of itensMaterialExtraidos) {
            await base44.entities.ItemMaterialNF.create({
              ...itemMat,
              lancamento_financeiro_id: currentLancId, // Vínculo com o pagamento
              os_numero: ordensServico[0]?.numero || "", // Pega a primeira OS da lista
              os_local: ordensServico[0]?.locais_prestacao_servicos?.[0] || "Natal", // Pega o primeiro local selecionado
              contrato_id: contratoId
            });
            // Espera 150ms entre cada item para evitar erro 429
            await new Promise(r => setTimeout(r, 150));
          }
        }
        // Espera entre lançamentos
        await new Promise(r => setTimeout(r, 200));
      }

      toast.success("Todos os dados foram salvos com sucesso!");
      onSave();
    } catch (error) {
      console.error("Erro fatal no salvamento:", error);
      toast.error("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };