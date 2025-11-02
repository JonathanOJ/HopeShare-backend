const financialReportController = require("../financialReportController");
const donationModel = require("../../models/donationModel");
const campanhaModel = require("../../models/campanhaModel");
const depositModel = require("../../models/depositModel");
const financialReportModel = require("../../models/financialReportModel");
const fileService = require("../../services/fileService");
const uploadService = require("../../services/uploadService");

// Mock dos modelos e serviços
jest.mock("../../models/donationModel");
jest.mock("../../models/campanhaModel");
jest.mock("../../models/depositModel");
jest.mock("../../models/financialReportModel");
jest.mock("../../services/fileService", () => ({
  generateAndUploadFinancialReport: jest.fn(),
  generateAndUploadAccountingReport: jest.fn(),
  generateAndUploadReport: jest.fn(),
}));
jest.mock("../../services/uploadService", () => ({
  uploadReportPDF: jest.fn(),
  deleteFile: jest.fn(),
  deleteReportPDF: jest.fn(),
}));

describe("financialReportController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("exportReport", () => {
    it("deve exportar relatório financeiro em PDF com sucesso", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
        user_responsable: {
          user_id: "user123",
          username: "João Silva",
        },
        value_required: 10000,
        status: "ACTIVE",
      };

      const mockDonations = [
        {
          payment_id: "pay1",
          amount: 100,
          status: "approved",
          created_at: "2025-11-01T10:00:00Z",
          payment_method: "pix",
          user_id: "donor1",
        },
        {
          payment_id: "pay2",
          amount: 200,
          status: "approved",
          created_at: "2025-11-02T10:00:00Z",
          payment_method: "credit_card",
          user_id: "donor2",
        },
      ];

      const mockDeposits = {
        Items: [
          {
            request_id: "dep1",
            campanha: {
              campanha_id: "camp123",
              value_donated: 250,
            },
            status: "COMPLETED",
            created_at: "2025-11-03T10:00:00Z",
            method_withdraw: "pix",
          },
        ],
      };

      const mockPdfResult = {
        file_url: "https://s3.amazonaws.com/report.pdf",
        file_key: "reports/report-123.pdf",
        file_name: "financial-report-camp123.pdf",
        file_size: 1024,
        generated_at: "2025-11-02T10:00:00Z",
      };

      const mockSavedReport = {
        report_id: "report123",
        ...mockPdfResult,
        campanha_id: "camp123",
        user_id: "user123",
        report_type: "FINANCEIRO",
      };

      req.params = { campanha_id: "camp123" };
      req.body = {
        type: "FINANCEIRO",
        format: "pdf",
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      donationModel.findByCampanhaId.mockResolvedValue(mockDonations);
      depositModel.getMySolicitacoesDeposito.mockResolvedValue(mockDeposits);
      fileService.generateAndUploadReport.mockResolvedValue(mockPdfResult);
      financialReportModel.saveReport.mockResolvedValue(mockSavedReport);

      await financialReportController.exportReport(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("camp123");
      expect(donationModel.findByCampanhaId).toHaveBeenCalledWith("camp123");
      expect(depositModel.getMySolicitacoesDeposito).toHaveBeenCalledWith(
        "user123"
      );
      expect(fileService.generateAndUploadReport).toHaveBeenCalled();
      expect(financialReportModel.saveReport).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSavedReport);
    });

    it("deve exportar relatório contábil em CSV com sucesso", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
        user_responsable: {
          user_id: "user123",
          username: "João Silva",
          email: "joao@example.com",
        },
      };

      const mockDonations = [];
      const mockDeposits = { Items: [] };

      const mockCsvResult = {
        file_url: "https://s3.amazonaws.com/report.csv",
        file_key: "reports/report-123.csv",
        file_name: "accounting-report-camp123.csv",
        file_size: 2048,
        generated_at: "2025-11-02T10:00:00Z",
      };

      const mockSavedReport = {
        report_id: "report456",
        ...mockCsvResult,
        report_type: "CONTABIL",
      };

      req.params = { campanha_id: "camp123" };
      req.body = {
        type: "CONTABIL",
        format: "csv",
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      donationModel.findByCampanhaId.mockResolvedValue(mockDonations);
      depositModel.getMySolicitacoesDeposito.mockResolvedValue(mockDeposits);
      uploadService.uploadReportPDF.mockResolvedValue({
        url: mockCsvResult.file_url,
        key: mockCsvResult.file_key,
      });
      financialReportModel.saveReport.mockResolvedValue(mockSavedReport);

      await financialReportController.exportReport(req, res);

      expect(uploadService.uploadReportPDF).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar erro 400 quando tipo de relatório é inválido", async () => {
      req.params = { campanha_id: "camp123" };
      req.body = {
        type: "INVALIDO",
      };

      await financialReportController.exportReport(req, res);

      expect(campanhaModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Tipo de relatório inválido",
        message: "Use type=FINANCEIRO ou type=CONTABIL",
      });
    });

    it("deve retornar erro 400 quando falta tipo de relatório", async () => {
      req.params = { campanha_id: "camp123" };
      req.body = {
        // sem type
        format: "pdf",
      };

      await financialReportController.exportReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar erro 404 quando campanha não existe", async () => {
      req.params = { campanha_id: "camp999" };
      req.body = {
        type: "FINANCEIRO",
      };

      campanhaModel.findById.mockResolvedValue(null);

      await financialReportController.exportReport(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("camp999");
      expect(donationModel.findByCampanhaId).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Campanha não encontrada",
      });
    });

    it("deve retornar erro 500 ao falhar na geração do relatório", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        user_responsable: { user_id: "user123" },
      };

      req.params = { campanha_id: "camp123" };
      req.body = {
        type: "FINANCEIRO",
        format: "pdf",
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      donationModel.findByCampanhaId.mockRejectedValue(
        new Error("Erro no banco")
      );

      await financialReportController.exportReport(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: "Erro no banco",
        })
      );
    });

    it("deve filtrar depósitos pela campanha correta", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        user_responsable: { user_id: "user123" },
      };

      const mockDeposits = {
        Items: [
          {
            request_id: "dep1",
            campanha: { campanha_id: "camp123", value_donated: 100 },
            status: "COMPLETED",
          },
          {
            request_id: "dep2",
            campanha: { campanha_id: "camp456", value_donated: 200 },
            status: "COMPLETED",
          },
        ],
      };

      req.params = { campanha_id: "camp123" };
      req.body = { type: "FINANCEIRO", format: "pdf" };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      donationModel.findByCampanhaId.mockResolvedValue([]);
      depositModel.getMySolicitacoesDeposito.mockResolvedValue(mockDeposits);
      fileService.generateAndUploadReport.mockResolvedValue({
        file_url: "url",
        file_key: "key",
        file_name: "name",
        file_size: 100,
        generated_at: new Date().toISOString(),
      });
      financialReportModel.saveReport.mockResolvedValue({ report_id: "rep1" });

      await financialReportController.exportReport(req, res);

      // Verifica que o relatório foi gerado
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("listReports", () => {
    it("deve listar relatórios do usuário com sucesso", async () => {
      const mockReports = [
        {
          report_id: "rep1",
          user_id: "user123",
          file_url: "https://s3.amazonaws.com/report1.pdf",
          report_type: "FINANCEIRO",
          generated_at: "2025-11-01T10:00:00Z",
        },
        {
          report_id: "rep2",
          user_id: "user123",
          file_url: "https://s3.amazonaws.com/report2.pdf",
          report_type: "CONTABIL",
          generated_at: "2025-11-02T10:00:00Z",
        },
      ];

      req.params = { user_id: "user123" };

      financialReportModel.findReportsByUserId.mockResolvedValue(mockReports);

      await financialReportController.listReports(req, res);

      expect(financialReportModel.findReportsByUserId).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it("deve retornar lista vazia quando usuário não tem relatórios", async () => {
      req.params = { user_id: "user123" };

      financialReportModel.findReportsByUserId.mockResolvedValue([]);

      await financialReportController.listReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 500 ao falhar na busca", async () => {
      req.params = { user_id: "user123" };

      financialReportModel.findReportsByUserId.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await financialReportController.listReports(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erro ao listar relatórios",
        message: "Erro no DynamoDB",
      });
    });
  });

  describe("deleteReport", () => {
    it("deve deletar relatório com sucesso", async () => {
      const mockReport = {
        financial_report_id: "rep123",
        file_key: "reports/report-123.pdf",
        user_id: "user123",
      };

      req.params = { financial_report_id: "rep123" };

      financialReportModel.findReportById.mockResolvedValue(mockReport);
      uploadService.deleteReportPDF.mockResolvedValue({ success: true });
      financialReportModel.deleteReport.mockResolvedValue({ success: true });

      await financialReportController.deleteReport(req, res);

      expect(financialReportModel.findReportById).toHaveBeenCalledWith(
        "rep123"
      );
      expect(uploadService.deleteReportPDF).toHaveBeenCalledWith(
        "reports/report-123.pdf"
      );
      expect(financialReportModel.deleteReport).toHaveBeenCalledWith("rep123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Relatório deletado com sucesso",
      });
    });

    it("deve retornar erro 404 quando relatório não existe", async () => {
      req.params = { financial_report_id: "rep999" };

      financialReportModel.findReportById.mockResolvedValue(null);

      await financialReportController.deleteReport(req, res);

      expect(financialReportModel.findReportById).toHaveBeenCalledWith(
        "rep999"
      );
      expect(uploadService.deleteReportPDF).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Relatório não encontrado",
      });
    });

    it("deve retornar erro 500 se falhar ao deletar arquivo do S3", async () => {
      const mockReport = {
        financial_report_id: "rep123",
        file_key: "reports/report-123.pdf",
      };

      req.params = { financial_report_id: "rep123" };

      financialReportModel.findReportById.mockResolvedValue(mockReport);
      uploadService.deleteReportPDF.mockRejectedValue(new Error("Erro no S3"));

      await financialReportController.deleteReport(req, res);

      // Deve retornar erro 500 quando não consegue deletar do S3
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erro ao deletar relatório",
        message: "Erro no S3",
      });
    });

    it("deve retornar erro 500 ao falhar na deleção", async () => {
      const mockReport = {
        financial_report_id: "rep123",
        file_key: "reports/report-123.pdf",
      };

      req.params = { financial_report_id: "rep123" };

      financialReportModel.findReportById.mockResolvedValue(mockReport);
      uploadService.deleteReportPDF.mockResolvedValue({ success: true });
      financialReportModel.deleteReport.mockRejectedValue(
        new Error("Erro ao deletar do banco")
      );

      await financialReportController.deleteReport(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erro ao deletar relatório",
        message: "Erro ao deletar do banco",
      });
    });
  });
});
