const PDFDocument = require("pdfkit");
const { Readable } = require("stream");
const uploadService = require("./uploadService");

const generateFinancialReportPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Relatório Financeiro - ${reportData.metadata.campanha_name}`,
          Author: "HopeShare Platform",
          Subject: "Relatório Financeiro de Campanha",
          CreatedDate: new Date(),
        },
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Relatório Financeiro", { align: "center" });

      doc
        .fontSize(18)
        .font("Helvetica")
        .text(reportData.metadata.campanha_title, { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .text(
          `Gerado em: ${new Date(
            reportData.metadata.generated_at
          ).toLocaleString("pt-BR")}`,
          { align: "center" }
        )
        .text(
          `Período: ${reportData.metadata.period.start} até ${reportData.metadata.period.end}`,
          { align: "center" }
        )
        .text(`Status: ${reportData.metadata.campanha_status}`, {
          align: "center",
        })
        .moveDown(2);

      // ========== SEÇÃO 1: RESUMO FINANCEIRO ==========
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("1. Resumo Financeiro Geral")
        .moveDown(0.5);

      doc.fontSize(11).font("Helvetica").fillColor("#000000");

      const summary = reportData.summary;

      addKeyValue(
        doc,
        "Total Arrecadado:",
        formatCurrency(summary.total_arrecadado)
      );
      addKeyValue(
        doc,
        "Taxas Aplicadas:",
        formatCurrency(summary.taxas_aplicadas)
      );
      addKeyValue(
        doc,
        "Total Líquido:",
        formatCurrency(summary.total_liquido),
        true
      );
      addKeyValue(
        doc,
        "Saldo Disponível:",
        formatCurrency(summary.saldo_atual)
      );
      addKeyValue(
        doc,
        "Meta da Campanha:",
        formatCurrency(summary.meta_campanha)
      );
      addKeyValue(
        doc,
        "Percentual Atingido:",
        `${summary.percentual_atingido.toFixed(2)}%`
      );

      doc.moveDown(1.5);

      // ========== SEÇÃO 2: ARRECADAÇÕES ==========
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("2. Detalhamento das Arrecadações")
        .moveDown(0.5);

      doc.fontSize(11).font("Helvetica").fillColor("#000000");

      const donations = reportData.donations;

      addKeyValue(
        doc,
        "Total de Doações Aprovadas:",
        donations.total_donations.toString()
      );
      addKeyValue(
        doc,
        "Valor Médio por Doação:",
        formatCurrency(donations.average_donation)
      );

      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica-Bold").text("Doações por Status:");
      doc.fontSize(11).font("Helvetica");

      Object.entries(donations.by_status).forEach(([status, count]) => {
        doc.text(`  • ${status}: ${count} doações`, { indent: 20 });
      });

      doc.moveDown(1);

      // Top 5 Doadores
      if (donations.top_donors && donations.top_donors.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Top 5 Doadores:");
        doc.fontSize(10).font("Helvetica");

        donations.top_donors.slice(0, 5).forEach((donor, index) => {
          doc.text(
            `  ${index + 1}. Doador ${donor.user_id}: ${formatCurrency(
              donor.total
            )} (${donor.count} doações)`,
            { indent: 20 }
          );
        });
      }

      doc.moveDown(1.5);

      // ========== SEÇÃO 3: CUSTOS ==========
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("3. Taxas e Custos Operacionais")
        .moveDown(0.5);

      doc.fontSize(11).font("Helvetica").fillColor("#000000");

      const costs = reportData.costs;

      addKeyValue(
        doc,
        "Taxa da Plataforma:",
        `${formatCurrency(costs.platform_fee.amount)} (${(
          costs.platform_fee.rate * 100
        ).toFixed(2)}%)`
      );
      addKeyValue(
        doc,
        "Taxa do Gateway de Pagamento:",
        `${formatCurrency(costs.payment_gateway_fee.estimated_amount)} (${(
          costs.payment_gateway_fee.rate * 100
        ).toFixed(2)}%)`
      );
      addKeyValue(
        doc,
        "Total de Custos:",
        formatCurrency(costs.total_costs),
        true
      );

      doc.moveDown(1.5);

      // ========== SEÇÃO 4: TRANSFERÊNCIAS ==========
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("4. Transferências e Saques")
        .moveDown(0.5);

      doc.fontSize(11).font("Helvetica").fillColor("#000000");

      const transfers = reportData.transfers;

      // Informação sobre solicitação de depósito
      if (transfers.has_deposit_request) {
        addKeyValue(
          doc,
          "Solicitação de Depósito:",
          transfers.is_completed ? "Realizada" : "Pendente"
        );

        if (transfers.is_completed) {
          addKeyValue(doc, "Status da Campanha:", "Finalizada");
          addKeyValue(doc, "Data do Depósito:", transfers.deposit_date);
          addKeyValue(
            doc,
            "Valor Transferido:",
            formatCurrency(transfers.total_transferred)
          );
        } else {
          addKeyValue(doc, "Status:", transfers.deposit_status);
          addKeyValue(
            doc,
            "Valor Disponível:",
            formatCurrency(
              !transfers.is_completed ? transfers.pending_transfer : 0
            )
          );
        }
      } else {
        addKeyValue(
          doc,
          "Solicitação de Depósito:",
          "Nenhuma solicitação realizada"
        );
        addKeyValue(
          doc,
          "Saldo Disponível:",
          formatCurrency(transfers.pending_transfer)
        );

        if (transfers.campaign_finished) {
          doc.moveDown(0.3);
          doc
            .fontSize(10)
            .fillColor("#27ae60")
            .text(
              "ℹ Campanha finalizada. Você pode solicitar o saque do saldo.",
              {
                indent: 20,
              }
            );
          doc.fillColor("#000000");
        }
      }

      doc.fontSize(11).font("Helvetica").fillColor("#7f8c8d");
      doc.moveDown(0.5);
      doc.text(
        "Observação: Apenas 1 solicitação de depósito é permitida por campanha.",
        {
          indent: 20,
          align: "left",
        }
      );
      doc.fillColor("#000000");

      doc.moveDown(1.5);

      // ========== SEÇÃO 5: SALDO ==========
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("5. Saldo e Conclusões")
        .moveDown(0.5);

      doc.fontSize(11).font("Helvetica").fillColor("#000000");

      const balance = reportData.balance;

      addKeyValue(
        doc,
        "Total Recebido:",
        formatCurrency(balance.total_received)
      );
      addKeyValue(
        doc,
        "Total Transferido:",
        formatCurrency(balance.total_transferred)
      );
      addKeyValue(
        doc,
        "Saldo Disponível:",
        formatCurrency(balance.available_balance),
        true
      );
      addKeyValue(
        doc,
        "Pode Solicitar Saque:",
        balance.can_request_withdraw ? "Sim" : "Não"
      );

      if (
        balance.withdraw_recommendations &&
        balance.withdraw_recommendations.length > 0
      ) {
        doc.moveDown(0.5);
        doc.fontSize(12).font("Helvetica-Bold").text("Recomendações:");
        doc.fontSize(10).font("Helvetica");

        balance.withdraw_recommendations.forEach((rec) => {
          doc.text(`  • ${rec}`, { indent: 20 });
        });
      }

      // ========== RODAPÉ ==========
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor("#7f8c8d")
        .text(
          "Este relatório foi gerado automaticamente pela plataforma HopeShare.",
          { align: "center" }
        )
        .text(`ID da Campanha: ${reportData.metadata.campanha_id}`, {
          align: "center",
        });

      // Finaliza o documento
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Adiciona par chave-valor formatado
 */
function addKeyValue(doc, key, value, bold = false) {
  const currentY = doc.y;
  doc.font("Helvetica-Bold").text(key, { continued: true, width: 200 });
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fillColor(bold ? "#27ae60" : "#000000")
    .text(` ${value}`, { width: 300 });
  doc.fillColor("#000000");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

const generateAndUploadReport = async (reportData) => {
  try {
    const pdfBuffer = await generateFinancialReportPDF(reportData);

    const fileName = `financial-report-${
      reportData.metadata.campanha_title
    }-${Date.now()}.pdf`;

    const uploadResult = await uploadService.uploadReportPDF(
      fileName,
      pdfBuffer
    );

    return {
      success: true,
      file_url: uploadResult.url,
      file_key: uploadResult.key,
      file_name: fileName,
      file_size: pdfBuffer.length,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao gerar e fazer upload do relatório:", error);
    throw error;
  }
};

const generateAccountingReportPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Relatório Contábil - ${reportData.header.campanha.nome}`,
          Author: "HopeShare Platform",
          Subject: "Relatório Contábil para Auditoria",
          CreatedDate: new Date(),
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("RELATÓRIO CONTÁBIL", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text("Documento de Prestação de Contas e Auditoria", {
          align: "center",
        })
        .moveDown(1.5);

      doc.fontSize(10).font("Helvetica-Bold").text("DADOS DA CAMPANHA:");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Nome: ${reportData.header.campanha.nome}`);
      doc.text(`ID: ${reportData.header.campanha.id}`);
      doc.text(`CPF/CNPJ: ${reportData.header.campanha.cnpj_cpf}`);
      doc.text(`Responsável: ${reportData.header.campanha.responsavel}`);
      doc.text(`Status: ${reportData.header.campanha.status}`);
      doc.moveDown(0.5);

      // Período Contábil
      doc.fontSize(10).font("Helvetica-Bold").text("PERÍODO DE APURAÇÃO:");
      doc.fontSize(10).font("Helvetica");
      doc.text(
        `De ${reportData.header.periodo_contabil.inicio} até ${reportData.header.periodo_contabil.fim}`
      );
      doc.text(
        `Gerado em: ${new Date(reportData.header.data_geracao).toLocaleString(
          "pt-BR"
        )}`
      );
      doc.moveDown(1.5);

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("1. RESUMO DAS RECEITAS")
        .moveDown(0.5);

      doc.fontSize(10).font("Helvetica").fillColor("#000000");

      const receitas = reportData.resumo_receitas;
      addKeyValue(doc, "Total de Doações:", receitas.total_doacoes.toString());
      addKeyValue(
        doc,
        "Valor Total:",
        formatCurrency(receitas.valor_total),
        true
      );
      addKeyValue(doc, "Valor Médio:", formatCurrency(receitas.valor_medio));

      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica-Bold").text("Detalhamento por Método:");
      doc.fontSize(9).font("Helvetica");

      Object.entries(receitas.detalhamento_por_metodo).forEach(
        ([metodo, dados]) => {
          doc.text(
            `  • ${metodo}: ${dados.quantidade} doações - ${formatCurrency(
              dados.valor
            )}`
          );
        }
      );

      doc.moveDown(1);

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("2. TRANSFERÊNCIAS REALIZADAS")
        .moveDown(0.5);

      doc.fontSize(10).font("Helvetica").fillColor("#000000");

      const transf = reportData.transferencias;
      addKeyValue(
        doc,
        "Total de Transferências:",
        transf.total_transferencias.toString()
      );
      addKeyValue(
        doc,
        "Valor Transferido:",
        formatCurrency(transf.valor_total_transferido),
        true
      );
      addKeyValue(
        doc,
        "Transferências Pendentes:",
        transf.transferencias_pendentes.toString()
      );
      addKeyValue(
        doc,
        "Valor Pendente:",
        formatCurrency(transf.valor_pendente)
      );

      if (transf.detalhamento && transf.detalhamento.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(9).font("Helvetica-Bold").text("Detalhamento:");
        doc.fontSize(8).font("Helvetica");

        transf.detalhamento.slice(0, 10).forEach((t) => {
          doc.text(
            `  • ${t.data} - ${formatCurrency(t.valor)} - ${t.metodo} - ${
              t.descricao
            }`
          );
        });

        if (transf.detalhamento.length > 10) {
          doc.text(
            `  ... e mais ${transf.detalhamento.length - 10} transferências`
          );
        }
      }

      doc.moveDown(1);

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("3. TAXAS E ENCARGOS")
        .moveDown(0.5);

      doc.fontSize(10).font("Helvetica").fillColor("#000000");

      const taxas = reportData.taxas_encargos;
      addKeyValue(doc, "Total de Taxas:", formatCurrency(taxas.total_taxas));
      addKeyValue(
        doc,
        "Percentual sobre Receitas:",
        `${taxas.percentual_sobre_receitas.toFixed(2)}%`
      );

      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica-Bold").text("Detalhamento:");
      doc.fontSize(9).font("Helvetica");

      taxas.detalhamento.forEach((taxa) => {
        doc.text(
          `  • ${taxa.descricao} (${taxa.percentual}): ${formatCurrency(
            taxa.valor
          )}`
        );
      });

      doc.moveDown(0.5);
      doc.fontSize(8).font("Helvetica-Oblique");
      taxas.observacoes.forEach((obs) => {
        doc.text(`  * ${obs}`);
      });

      doc.moveDown(1);

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("4. SALDO FINAL E OBSERVAÇÕES")
        .moveDown(0.5);

      doc.fontSize(10).font("Helvetica").fillColor("#000000");

      const saldo = reportData.saldo_final;
      addKeyValue(
        doc,
        "Total de Receitas:",
        formatCurrency(saldo.total_receitas)
      );
      addKeyValue(
        doc,
        "Total de Transferências:",
        formatCurrency(saldo.total_transferencias)
      );
      addKeyValue(doc, "Total de Taxas:", formatCurrency(saldo.total_taxas));
      addKeyValue(
        doc,
        "Saldo Disponível:",
        formatCurrency(saldo.saldo_disponivel),
        true
      );

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(`Status: ${saldo.status_saldo}`);

      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica-Bold").text("Observações Contábeis:");
      doc.fontSize(8).font("Helvetica");
      saldo.observacoes_contabeis.forEach((obs) => {
        doc.text(`  • ${obs}`);
      });

      doc.moveDown(1.5);

      if (
        reportData.extrato_contabil &&
        reportData.extrato_contabil.movimentacoes.length > 0
      ) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#2c3e50")
          .text("5. EXTRATO CONTÁBIL (Últimas 15 Movimentações)")
          .moveDown(0.5);

        doc.fontSize(8).font("Helvetica").fillColor("#000000");

        const movs = reportData.extrato_contabil.movimentacoes.slice(0, 15);
        movs.forEach((mov) => {
          doc.text(
            `${mov.numero}. ${mov.data} | ${mov.tipo} | ${
              mov.categoria
            } | ${formatCurrency(mov.valor)}`
          );
          doc.fontSize(7).text(`   ${mov.descricao}`, { indent: 20 });
          doc.fontSize(8);
        });

        if (reportData.extrato_contabil.movimentacoes.length > 15) {
          doc
            .fontSize(8)
            .font("Helvetica-Oblique")
            .text(
              `... e mais ${
                reportData.extrato_contabil.movimentacoes.length - 15
              } movimentações`
            );
        }
      }

      doc.moveDown(2);
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("DECLARAÇÃO", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(7)
        .font("Helvetica")
        .text(reportData.footer.declaracao, { align: "justify" })
        .moveDown(0.5);

      doc
        .fontSize(7)
        .text(`Responsável Técnico: ${reportData.footer.responsavel_tecnico}`, {
          align: "center",
        })
        .text(`Contato: ${reportData.footer.contato}`, { align: "center" })
        .text(`Versão do Relatório: ${reportData.footer.versao_relatorio}`, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateAndUploadAccountingReport = async (reportData) => {
  try {
    const pdfBuffer = await generateAccountingReportPDF(reportData);
    const fileName = `accounting-report-${
      reportData.metadata.campanha_title
    }-${Date.now()}.pdf`;

    const uploadResult = await uploadService.uploadReportPDF(
      fileName,
      pdfBuffer
    );

    return {
      success: true,
      file_url: uploadResult.url,
      file_key: uploadResult.key,
      file_name: fileName,
      file_size: pdfBuffer.length,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao gerar relatório contábil em PDF:", error);
    throw error;
  }
};

module.exports = {
  generateFinancialReportPDF,
  generateAndUploadReport,
  generateAccountingReportPDF,
  generateAndUploadAccountingReport,
};
