const donationModel = require("../models/donationModel");
const campanhaModel = require("../models/campanhaModel");
const depositModel = require("../models/depositModel");
const financialReportModel = require("../models/financialReportModel");
const fileService = require("../services/fileService");
const uploadService = require("../services/uploadService");

const generateAccountingReport = async (req, res) => {
  try {
    const { campanha_id } = req.params;
    const { start_date, end_date } = req.query;

    const campanha = await campanhaModel.findById(campanha_id);
    if (!campanha) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    const allDonations = await donationModel.findByCampanhaId(campanha_id);

    let donations = allDonations;
    if (start_date || end_date) {
      donations = allDonations.filter((donation) => {
        const donationDate = new Date(donation.created_at);
        const start = start_date ? new Date(start_date) : null;
        const end = end_date ? new Date(end_date) : null;

        if (start && end) {
          return donationDate >= start && donationDate <= end;
        } else if (start) {
          return donationDate >= start;
        } else if (end) {
          return donationDate <= end;
        }
        return true;
      });
    }

    const deposits = await depositModel.getMySolicitacoesDeposito(
      campanha.user_responsable.user_id
    );
    const campaignDeposits =
      deposits.Items?.filter((d) => d.campanha.campanha_id === campanha_id) ||
      [];

    let filteredDeposits = campaignDeposits;
    if (start_date || end_date) {
      filteredDeposits = campaignDeposits.filter((deposit) => {
        const depositDate = new Date(deposit.created_at);
        const start = start_date ? new Date(start_date) : null;
        const end = end_date ? new Date(end_date) : null;

        if (start && end) {
          return depositDate >= start && depositDate <= end;
        } else if (start) {
          return depositDate >= start;
        } else if (end) {
          return depositDate <= end;
        }
        return true;
      });
    }

    const receitasDonacoes = donations
      .filter((d) => d.status === "approved")
      .map((d) => ({
        data: new Date(d.created_at).toISOString().split("T")[0],
        descricao: `Doação recebida - ID ${d.payment_id}`,
        valor: d.amount,
        tipo: "RECEITA",
        metodo_pagamento: d.payment_method || "N/A",
      }));

    const totalReceitas = receitasDonacoes.reduce((sum, r) => sum + r.valor, 0);

    const transferenciasRealizadas = filteredDeposits
      .filter((d) => d.status === "COMPLETED")
      .map((d) => ({
        data: new Date(d.updated_at || d.created_at)
          .toISOString()
          .split("T")[0],
        descricao: `Transferência realizada - ID ${d.request_id}`,
        valor: d.campanha.value_donated,
        tipo: "SAÍDA",
        metodo: d.method_withdraw || "N/A",
        dados_bancarios: d.dados_bancarios
          ? `${d.dados_bancarios.bank_name || "Banco"} - Ag: ${
              d.dados_bancarios.agency
            } - Conta: ${d.dados_bancarios.account}`
          : "Pix",
      }));

    const totalTransferencias = transferenciasRealizadas.reduce(
      (sum, t) => sum + t.valor,
      0
    );

    const taxaPlataforma = totalReceitas * 0.0;
    const taxaGateway = totalReceitas * 0.0;
    const totalTaxas = taxaPlataforma + taxaGateway;

    const taxasEncargos = [
      {
        descricao: "Taxa da Plataforma HopeShare",
        percentual: "0%",
        valor: taxaPlataforma,
        tipo: "TAXA",
      },
      {
        descricao: "Taxa Gateway de Pagamento (Mercado Pago)",
        percentual: "0%",
        valor: taxaGateway,
        tipo: "TAXA",
      },
    ];

    const saldoFinal = totalReceitas - totalTransferencias - totalTaxas;

    const movimentacoes = [
      ...receitasDonacoes.map((r) => ({ ...r, categoria: "Receita" })),
      ...transferenciasRealizadas.map((t) => ({
        ...t,
        categoria: "Transferência",
      })),
      ...taxasEncargos.map((t) => ({
        data: new Date().toISOString().split("T")[0],
        descricao: t.descricao,
        valor: t.valor,
        tipo: t.tipo,
        categoria: "Taxa/Encargo",
      })),
    ].sort((a, b) => new Date(a.data) - new Date(b.data));

    const accountingReport = {
      header: {
        titulo: "RELATÓRIO CONTÁBIL DE CAMPANHA",
        campanha: {
          id: campanha_id,
          nome: campanha.title,
          cnpj_cpf:
            campanha.user_responsable.cpf ||
            campanha.user_responsable.cnpj ||
            "N/A",
          responsavel: campanha.user_responsable.username,
          status: campanha.status,
        },
        periodo_contabil: {
          inicio: start_date || "Início da campanha",
          fim: end_date || "Data atual",
        },
        data_geracao: new Date().toISOString(),
      },

      resumo_receitas: {
        descricao: "Todas as doações aprovadas no período",
        total_doacoes: receitasDonacoes.length,
        valor_total: totalReceitas,
        valor_medio:
          receitasDonacoes.length > 0
            ? totalReceitas / receitasDonacoes.length
            : 0,
        detalhamento_por_metodo: donations
          .filter((d) => d.status === "approved")
          .reduce((acc, d) => {
            const method = d.payment_method || "Outros";
            if (!acc[method]) {
              acc[method] = { quantidade: 0, valor: 0 };
            }
            acc[method].quantidade += 1;
            acc[method].valor += d.amount;
            return acc;
          }, {}),
        receitas: receitasDonacoes,
      },

      transferencias: {
        descricao: "Transferências realizadas para o responsável da campanha",
        total_transferencias: transferenciasRealizadas.length,
        valor_total_transferido: totalTransferencias,
        transferencias_pendentes: filteredDeposits.filter(
          (d) => d.status === "PENDING"
        ).length,
        valor_pendente: filteredDeposits
          .filter((d) => d.status === "PENDING")
          .reduce((sum, d) => sum + (d.campanha.value_donated || 0), 0),
        detalhamento: transferenciasRealizadas,
        observacoes: [
          "Todas as transferências foram realizadas via Pix ou TED bancária",
          "Os valores já foram deduzidos das taxas aplicáveis",
        ],
      },

      taxas_encargos: {
        descricao: "Custos operacionais e taxas aplicadas sobre as receitas",
        total_taxas: totalTaxas,
        percentual_sobre_receitas:
          totalReceitas > 0 ? (totalTaxas / totalReceitas) * 100 : 0,
        detalhamento: taxasEncargos,
        observacoes: [
          "Taxa da plataforma: 0% (promoção)",
          "Taxa do gateway: ~3.99% sobre cada transação",
          "Valores já descontados automaticamente nas transferências",
        ],
      },

      saldo_final: {
        total_receitas: totalReceitas,
        total_transferencias: totalTransferencias,
        total_taxas: totalTaxas,
        saldo_disponivel: saldoFinal,
        status_saldo:
          saldoFinal > 0
            ? "POSITIVO - Há saldo disponível para saque"
            : saldoFinal < 0
            ? "NEGATIVO - Verificar inconsistências"
            : "ZERADO - Todas as receitas foram transferidas",
        observacoes_contabeis: [
          `Período de apuração: ${start_date || "início"} a ${
            end_date || "data atual"
          }`,
          `Total de movimentações no período: ${movimentacoes.length}`,
          "Relatório gerado automaticamente pelo sistema HopeShare",
          "Para auditoria, consulte os comprovantes individuais de cada transação",
        ],
      },

      extrato_contabil: {
        descricao: "Todas as movimentações ordenadas cronologicamente",
        total_movimentacoes: movimentacoes.length,
        movimentacoes: movimentacoes.map((m, index) => ({
          numero: index + 1,
          data: m.data,
          descricao: m.descricao,
          tipo: m.tipo,
          categoria: m.categoria,
          valor: m.valor,
          metodo: m.metodo_pagamento || m.metodo || "N/A",
        })),
      },

      informacoes_complementares: {
        meta_campanha: campanha.value_required,
        percentual_atingido: campanha.value_required
          ? (totalReceitas / campanha.value_required) * 100
          : 0,
        data_inicio_campanha: campanha.created_at,
        data_fim_campanha: campanha.data_encerramento || "Em andamento",
        total_doadores_unicos: [...new Set(donations.map((d) => d.user_id))]
          .length,
        ticket_medio:
          receitasDonacoes.length > 0
            ? totalReceitas / receitasDonacoes.length
            : 0,
      },

      footer: {
        declaracao:
          "Este relatório contábil reflete fielmente as movimentações financeiras registradas no sistema HopeShare durante o período informado.",
        responsavel_tecnico: "Sistema HopeShare - Plataforma de Crowdfunding",
        contato: "contato@hopeshare.com.br",
        versao_relatorio: "1.0",
      },
    };

    res.status(200).json({
      success: true,
      report: accountingReport,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório contábil:", error);
    res.status(500).json({
      error: "Erro ao gerar relatório contábil",
      message: error.message,
    });
  }
};

/**
 * F9 - Exporta relatório contábil em PDF
 * POST /campanha/:campanha_id/accounting-report/export
 */
const exportAccountingReport = async (req, res) => {
  try {
    const { campanha_id } = req.params;
    const { start_date, end_date, format = "pdf" } = req.query;

    const reportResponse = await generateAccountingReport({
      params: { campanha_id },
      query: { start_date, end_date },
    });

    let reportData;
    const mockRes = {
      status: () => ({
        json: (data) => {
          reportData = data.report;
        },
      }),
    };

    const campanha = await campanhaModel.findById(campanha_id);

    await generateAccountingReport(
      { params: { campanha_id }, query: { start_date, end_date } },
      mockRes
    );

    if (format === "pdf") {
      const pdfResult = await fileService.generateAndUploadAccountingReport(
        reportData
      );

      const savedReport = await financialReportModel.saveReport({
        campanha_id: campanha_id,
        user_id: campanha.user_responsable.user_id,
        file_url: pdfResult.file_url,
        file_key: pdfResult.file_key,
        file_name: pdfResult.file_name,
        file_size: pdfResult.file_size,
        period_start: start_date || null,
        period_end: end_date || null,
        generated_at: pdfResult.generated_at,
        report_type: "ACCOUNTING",
        metadata: reportData.header,
      });

      res.status(200).json({
        success: true,
        message: "Relatório contábil gerado com sucesso",
        report: {
          report_id: savedReport.report_id,
          file_url: savedReport.file_url,
          file_name: savedReport.file_name,
          file_size: savedReport.file_size,
          generated_at: savedReport.generated_at,
          report_type: "ACCOUNTING",
        },
      });
    } else if (format === "xml") {
      const xml = generateXMLReport(reportData);
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } else {
      res
        .status(400)
        .json({ error: "Formato não suportado. Use 'pdf' ou 'xml'" });
    }
  } catch (error) {
    console.error("Erro ao exportar relatório contábil:", error);
    res.status(500).json({
      error: "Erro ao exportar relatório contábil",
      message: error.message,
    });
  }
};

const exportReport = async (req, res) => {
  try {
    const { campanha_id } = req.params;
    const { type, start_date, end_date, format = "pdf" } = req.body;

    if (!type || !["FINANCEIRO", "CONTABIL"].includes(type)) {
      return res.status(400).json({
        error: "Tipo de relatório inválido",
        message: "Use type=FINANCEIRO ou type=CONTABIL",
      });
    }

    const campanha = await campanhaModel.findById(campanha_id);
    if (!campanha) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    let donations = await donationModel.findByCampanhaId(campanha_id);

    const deposits = await depositModel.getMySolicitacoesDeposito(
      campanha.user_responsable.user_id
    );
    let filteredDeposits =
      deposits.Items?.filter((d) => d.campanha.campanha_id === campanha_id) ||
      [];

    const approvedDonations = donations.filter((d) => d.status === "approved");
    const totalArrecadado = approvedDonations.reduce(
      (sum, d) => sum + (d.amount || 0),
      0
    );
    const totalDoacoes = approvedDonations.length;
    const valorMedio = totalDoacoes > 0 ? totalArrecadado / totalDoacoes : 0;
    const taxRate = 0.0;
    const taxasAplicadas = totalArrecadado * taxRate;
    const valorLiquido = totalArrecadado - taxasAplicadas;

    const donationsByStatus = donations.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    const saldoAtual = totalArrecadado;

    const donationsByDate = approvedDonations.reduce((acc, d) => {
      const date = new Date(d.created_at).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { count: 0, amount: 0 };
      }
      acc[date].count += 1;
      acc[date].amount += d.amount || 0;
      return acc;
    }, {});

    const donorsByAmount = approvedDonations.reduce((acc, d) => {
      if (!acc[d.user_id]) {
        acc[d.user_id] = {
          user_id: d.user_id,
          total: 0,
          count: 0,
        };
      }
      acc[d.user_id].total += d.amount || 0;
      acc[d.user_id].count += 1;
      return acc;
    }, {});

    const topDonors = Object.values(donorsByAmount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    let reportData;
    let pdfResult;

    if (type === "FINANCEIRO") {
      reportData = {
        metadata: {
          generated_at: new Date().toISOString(),
          campanha_id: campanha_id,
          campanha_title: campanha.title,
          campanha_status: campanha.status,
          period: {
            start: start_date || "Início da campanha",
            end: end_date || "Até agora",
          },
          user_responsable: {
            user_id: campanha.user_responsable.user_id,
            username: campanha.user_responsable.username,
          },
        },
        summary: {
          total_arrecadado: totalArrecadado,
          total_liquido: valorLiquido,
          taxas_aplicadas: taxasAplicadas,
          tax_rate: taxRate,
          saldo_atual: saldoAtual,
          meta_campanha: campanha.value_required,
          percentual_atingido: campanha.value_required
            ? (totalArrecadado / campanha.value_required) * 100
            : 0,
        },
        donations: {
          total_donations: totalDoacoes,
          total_donations_all_status: donations.length,
          average_donation: valorMedio,
          by_status: donationsByStatus,
          by_date: Object.entries(donationsByDate)
            .map(([date, data]) => ({
              date,
              count: data.count,
              amount: data.amount,
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date)),
          top_donors: topDonors,
        },
        costs: {
          platform_fee: {
            rate: taxRate,
            amount: taxasAplicadas,
            description: "Taxa da plataforma",
          },
          payment_gateway_fee: {
            rate: 0.0,
            estimated_amount: totalArrecadado * 0.0,
            description: "Taxa estimada do gateway de pagamento",
          },
          total_costs: taxasAplicadas + totalArrecadado * 0.0,
        },
        transfers: {
          has_deposit_request: filteredDeposits.length > 0,
          deposit_status:
            filteredDeposits.length > 0 ? filteredDeposits[0].status : null,
          is_completed:
            filteredDeposits.length > 0 &&
            filteredDeposits[0].status === "PROCESSED",
          campaign_finished: campanha.status === "FINISHED",
          total_transferred:
            filteredDeposits.length > 0
              ? filteredDeposits[0].campanha.value_donated
              : 0,
          pending_transfer: saldoAtual,
          deposit_date:
            filteredDeposits.length > 0 &&
            filteredDeposits[0].status === "PROCESSED"
              ? new Date(
                  filteredDeposits[0].updated_at ||
                    filteredDeposits[0].created_at
                ).toLocaleDateString("pt-BR")
              : null,
        },
        balance: {
          total_received: totalArrecadado,
          total_transferred: totalArrecadado,
          available_balance: saldoAtual,
          can_request_withdraw:
            saldoAtual > 0 && campanha.status === "FINISHED",
        },
      };

      pdfResult = await fileService.generateAndUploadReport(reportData);
    } else {
      const receitasDonacoes = approvedDonations.map((d) => ({
        data: new Date(d.created_at).toISOString().split("T")[0],
        descricao: `Doação recebida - ID ${d.payment_id}`,
        valor: d.amount,
        tipo: "RECEITA",
        metodo_pagamento: d.payment_method || "N/A",
      }));

      const transferenciasRealizadas = filteredDeposits
        .filter((d) => d.status === "COMPLETED")
        .map((d) => ({
          data: new Date(d.updated_at || d.created_at)
            .toISOString()
            .split("T")[0],
          descricao: `Transferência realizada - ID ${d.request_id}`,
          valor: d.campanha.value_donated,
          tipo: "SAÍDA",
          metodo: d.method_withdraw || "N/A",
        }));

      const taxaPlataforma = totalArrecadado * 0.0;
      const taxaGateway = totalArrecadado * 0.0;
      const totalTaxas = taxaPlataforma + taxaGateway;

      const taxasEncargos = [
        {
          descricao: "Taxa da Plataforma HopeShare",
          percentual: "0%",
          valor: taxaPlataforma,
          tipo: "TAXA",
        },
        {
          descricao: "Taxa Gateway de Pagamento (Mercado Pago)",
          percentual: "0%",
          valor: taxaGateway,
          tipo: "TAXA",
        },
      ];

      const saldoFinal = totalArrecadado;

      const movimentacoes = [
        ...receitasDonacoes.map((r) => ({ ...r, categoria: "Receita" })),
        ...transferenciasRealizadas.map((t) => ({
          ...t,
          categoria: "Transferência",
        })),
        ...taxasEncargos.map((t) => ({
          data: new Date().toISOString().split("T")[0],
          descricao: t.descricao,
          valor: t.valor,
          tipo: t.tipo,
          categoria: "Taxa/Encargo",
        })),
      ].sort((a, b) => new Date(a.data) - new Date(b.data));

      reportData = {
        header: {
          titulo: "RELATÓRIO CONTÁBIL DE CAMPANHA",
          campanha: {
            id: campanha_id,
            nome: campanha.title,
            cnpj_cpf:
              campanha.user_responsable.cpf ||
              campanha.user_responsable.cnpj ||
              "N/A",
            responsavel: campanha.user_responsable.username,
            status: campanha.status,
          },
          periodo_contabil: {
            inicio: start_date || "Início da campanha",
            fim: end_date || "Data atual",
          },
          data_geracao: new Date().toISOString(),
        },
        resumo_receitas: {
          descricao: "Todas as doações aprovadas no período",
          total_doacoes: receitasDonacoes.length,
          valor_total: totalArrecadado,
          valor_medio:
            receitasDonacoes.length > 0
              ? totalArrecadado / receitasDonacoes.length
              : 0,
          detalhamento_por_metodo: donations
            .filter((d) => d.status === "approved")
            .reduce((acc, d) => {
              const method = d.payment_method || "Outros";
              if (!acc[method]) {
                acc[method] = { quantidade: 0, valor: 0 };
              }
              acc[method].quantidade += 1;
              acc[method].valor += d.amount;
              return acc;
            }, {}),
          receitas: receitasDonacoes,
        },
        transferencias: {
          descricao: "Transferências realizadas para o responsável da campanha",
          total_transferencias: transferenciasRealizadas.length,
          valor_total_transferido: totalArrecadado,
          transferencias_pendentes: filteredDeposits.filter(
            (d) => d.status === "PENDING"
          ).length,
          valor_pendente: filteredDeposits
            .filter((d) => d.status === "PENDING")
            .reduce((sum, d) => sum + (d.campanha.value_donated || 0), 0),
          detalhamento: transferenciasRealizadas,
          observacoes: [
            "Todas as transferências foram realizadas via Pix ou TED bancária",
            "Os valores já foram deduzidos das taxas aplicáveis",
          ],
        },
        taxas_encargos: {
          descricao: "Custos operacionais e taxas aplicadas sobre as receitas",
          total_taxas: totalTaxas,
          percentual_sobre_receitas:
            totalArrecadado > 0 ? (totalTaxas / totalArrecadado) * 100 : 0,
          detalhamento: taxasEncargos,
          observacoes: [
            "Taxa da plataforma: 0% (promoção)",
            "Taxa do gateway: 0% sobre cada transação",
            "Valores já descontados automaticamente nas transferências",
          ],
        },
        saldo_final: {
          total_receitas: totalArrecadado,
          total_transferencias: totalArrecadado,
          total_taxas: totalTaxas,
          saldo_disponivel: saldoFinal,
          status_saldo:
            saldoFinal > 0
              ? "POSITIVO - Há saldo disponível para saque"
              : saldoFinal < 0
              ? "NEGATIVO - Verificar inconsistências"
              : "ZERADO - Todas as receitas foram transferidas",
          observacoes_contabeis: [
            `Período de apuração: ${start_date || "início"} a ${
              end_date || "data atual"
            }`,
            `Total de movimentações no período: ${movimentacoes.length}`,
            "Relatório gerado automaticamente pelo sistema HopeShare",
          ],
        },
        extrato_contabil: {
          descricao: "Todas as movimentações ordenadas cronologicamente",
          total_movimentacoes: movimentacoes.length,
          movimentacoes: movimentacoes.map((m, index) => ({
            numero: index + 1,
            data: m.data,
            descricao: m.descricao,
            tipo: m.tipo,
            categoria: m.categoria,
            valor: m.valor,
            metodo: m.metodo_pagamento || m.metodo || "N/A",
          })),
        },
        footer: {
          declaracao:
            "Este relatório contábil reflete fielmente as movimentações financeiras registradas no sistema HopeShare durante o período informado.",
          responsavel_tecnico: "Sistema HopeShare - Plataforma de Crowdfunding",
          contato: "contato@hopeshare.com.br",
          versao_relatorio: "1.0",
        },
      };

      pdfResult = await generateAndUploadCSVReport(
        reportData,
        campanha_id,
        donations,
        filteredDeposits
      );
    }

    const savedReport = await financialReportModel.saveReport({
      campanha: {
        campanha_id: campanha_id,
        title: campanha.title,
        status: campanha.status,
      },
      user: {
        user_id: campanha.user_responsable.user_id,
        username: campanha.user_responsable.username,
        email: campanha.user_responsable.email,
      },
      file_url: pdfResult.file_url,
      file_key: pdfResult.file_key,
      file_name: pdfResult.file_name,
      file_size: pdfResult.file_size,
      created_at: pdfResult.generated_at,
      type: type,
    });

    res.status(200).json(savedReport);
  } catch (error) {
    console.error("Erro ao exportar relatório:", error);
    res.status(500).json({
      error: "Erro ao exportar relatório",
      message: error.message,
    });
  }
};

const listReports = async (req, res) => {
  try {
    const { user_id } = req.params;

    let reports = await financialReportModel.findReportsByUserId(user_id);

    res.status(200).json(reports);
  } catch (error) {
    console.error("Erro ao listar relatórios:", error);
    res.status(500).json({
      error: "Erro ao listar relatórios",
      message: error.message,
    });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { financial_report_id } = req.params;

    const report = await financialReportModel.findReportById(
      financial_report_id
    );

    if (!report) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    await uploadService.deleteReportPDF(report.file_key);

    await financialReportModel.deleteReport(financial_report_id);

    res.status(200).json({
      success: true,
      message: "Relatório deletado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar relatório:", error);
    res.status(500).json({
      error: "Erro ao deletar relatório",
      message: error.message,
    });
  }
};

const generateAndUploadCSVReport = async (
  reportData,
  campaignId,
  donations,
  deposits
) => {
  try {
    const csvHeaders = [
      "ID da Transação",
      "Data da Transação",
      "Tipo de Transação",
      "Valor Bruto (R$)",
      "Taxas (%)",
      "Valor Líquido (R$)",
      "Método de Pagamento",
      "Doador",
      "Campanha Relacionada",
      "Status da Transação",
      "Data de Liquidação",
      "Centro de Custo / Categoria",
      "Observações",
    ];

    const csvRows = [csvHeaders.join(",")];

    donations.forEach((d) => {
      const taxRate = 0;
      const valorBruto = d.amount || 0;
      const valorTaxa = valorBruto * (taxRate / 100);
      const valorLiquido = valorBruto - valorTaxa;

      csvRows.push(
        [
          `"${d.payment_id || ""}"`,
          `"${new Date(d.created_at).toISOString().split("T")[0]}"`,
          `"Doação"`,
          valorBruto.toFixed(2),
          taxRate.toFixed(2),
          valorLiquido.toFixed(2),
          `"${d.payment_method || "N/A"}"`,
          `"${d.user_id || "Anônimo"}"`,
          `"${reportData.header.campanha.nome}"`,
          `"${
            d.status === "approved"
              ? "Pago"
              : d.status === "refunded"
              ? "Estornado"
              : "Pendente"
          }"`,
          `"${d.approved_at || d.created_at || ""}"`,
          `"Doações recebidas"`,
          `"${d.description || ""}"`,
        ].join(",")
      );
    });

    deposits
      .filter((d) => d.status === "COMPLETED")
      .forEach((d) => {
        csvRows.push(
          [
            `"${d.request_id || ""}"`,
            `"${
              new Date(d.updated_at || d.created_at).toISOString().split("T")[0]
            }"`,
            `"Saque"`,
            (d.campanha.value_donated || 0).toFixed(2),
            "0.00",
            (d.campanha.value_donated || 0).toFixed(2),
            `"${d.method_withdraw || "N/A"}"`,
            `"${reportData.header.campanha.responsavel}"`,
            `"${reportData.header.campanha.nome}"`,
            `"${d.request_id || ""}"`,
            `"Transferido"`,
            `"${
              new Date(d.updated_at || d.created_at).toISOString().split("T")[0]
            }"`,
            `"Transferências realizadas"`,
            `"${
              d.dados_bancarios
                ? JSON.stringify(d.dados_bancarios).replace(/"/g, "'")
                : "Pix"
            }"`,
          ].join(",")
        );
      });

    const csvContent = csvRows.join("\n");
    const BOM = "\uFEFF";
    const csvBuffer = Buffer.from(BOM + csvContent, "utf-8");

    const fileName = `accounting-report-${campaignId}-${Date.now()}.csv`;

    const uploadResult = await uploadService.uploadReportPDF(
      fileName,
      csvBuffer
    );

    return {
      success: true,
      file_url: uploadResult.url,
      file_key: uploadResult.key,
      file_name: fileName,
      file_size: csvBuffer.length,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao gerar CSV contábil:", error);
    throw error;
  }
};

module.exports = {
  exportReport,
  listReports,
  deleteReport,
};
