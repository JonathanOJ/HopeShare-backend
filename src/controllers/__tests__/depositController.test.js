const depositController = require("../depositController");
const depositModel = require("../../models/depositModel");
const campanhaModel = require("../../models/campanhaModel");
const validationUserModel = require("../../models/validationUserModel");
const configReceiptModel = require("../../models/configReceiptModel");
const userModel = require("../../models/userModel");

// Mock dos modelos
jest.mock("../../models/depositModel");
jest.mock("../../models/campanhaModel");
jest.mock("../../models/validationUserModel");
jest.mock("../../models/configReceiptModel");
jest.mock("../../models/userModel");

describe("depositController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("createSolicitacaoDeposito", () => {
    it("deve criar solicitação de depósito com sucesso", async () => {
      const mockUser = { user_id: "user123", username: "João Silva" };
      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
        value_donated: 5000,
      };
      const mockCampanhaExists = {
        campanha_id: "camp123",
        value_donated: 5000,
        status: "ACTIVE",
      };
      const mockValidation = { user_id: "user123", status: "APPROVED" };
      const mockConfigReceipt = {
        config_id: "config123",
        user_id: "user123",
        receipt_type: "PIX",
      };
      const mockResult = {
        request_id: "req123",
        user: mockUser,
        campanha: { ...mockCampanha, value_donated: 5000 },
        status: "PENDING",
      };

      req.body = { user: mockUser, campanha: mockCampanha };

      campanhaModel.findById.mockResolvedValue(mockCampanhaExists);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);
      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
        mockConfigReceipt
      );
      depositModel.createSolicitacaoDeposito.mockResolvedValue(mockResult);
      campanhaModel.updateStatusCampanha.mockResolvedValue({
        status: "FINISHED",
      });

      await depositController.createSolicitacaoDeposito(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("camp123");
      expect(validationUserModel.getValidationUser).toHaveBeenCalledWith(
        "user123"
      );
      expect(configReceiptModel.getConfigReceiptByUserId).toHaveBeenCalledWith(
        "user123"
      );
      expect(depositModel.createSolicitacaoDeposito).toHaveBeenCalledWith(
        mockUser,
        { ...mockCampanha, value_donated: 5000 }
      );
      expect(campanhaModel.updateStatusCampanha).toHaveBeenCalledWith(
        "camp123",
        "FINISHED"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando usuário está ausente", async () => {
      req.body = { campanha: { campanha_id: "camp123" } };

      await depositController.createSolicitacaoDeposito(req, res);

      expect(campanhaModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário ou campanha ausente",
      });
    });

    it("deve retornar erro 400 quando campanha está ausente", async () => {
      req.body = { user: { user_id: "user123" } };

      await depositController.createSolicitacaoDeposito(req, res);

      expect(campanhaModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário ou campanha ausente",
      });
    });

    it("deve retornar erro 404 quando campanha não existe", async () => {
      req.body = {
        user: { user_id: "user123" },
        campanha: { campanha_id: "camp999" },
      };

      campanhaModel.findById.mockResolvedValue(null);

      await depositController.createSolicitacaoDeposito(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("camp999");
      expect(validationUserModel.getValidationUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Campanha não encontrada",
      });
    });

    it("deve retornar erro 401 quando usuário não tem validação", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        value_donated: 5000,
      };

      req.body = {
        user: { user_id: "user123" },
        campanha: { campanha_id: "camp123" },
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      validationUserModel.getValidationUser.mockResolvedValue(null);

      await depositController.createSolicitacaoDeposito(req, res);

      expect(validationUserModel.getValidationUser).toHaveBeenCalledWith(
        "user123"
      );
      expect(
        configReceiptModel.getConfigReceiptByUserId
      ).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Usuário não autorizado a fazer depósitos. Verifique seu status de validação dos documentos.",
      });
    });

    it("deve retornar erro 401 quando validação não está aprovada", async () => {
      const mockCampanha = { campanha_id: "camp123", value_donated: 5000 };
      const mockValidation = { user_id: "user123", status: "PENDING" };

      req.body = {
        user: { user_id: "user123" },
        campanha: { campanha_id: "camp123" },
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);

      await depositController.createSolicitacaoDeposito(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Usuário não autorizado a fazer depósitos. Verifique seu status de validação dos documentos.",
      });
    });

    it("deve retornar erro 401 quando não há configuração de recebimento", async () => {
      const mockCampanha = { campanha_id: "camp123", value_donated: 5000 };
      const mockValidation = { user_id: "user123", status: "APPROVED" };

      req.body = {
        user: { user_id: "user123" },
        campanha: { campanha_id: "camp123" },
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);
      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);

      await depositController.createSolicitacaoDeposito(req, res);

      expect(configReceiptModel.getConfigReceiptByUserId).toHaveBeenCalledWith(
        "user123"
      );
      expect(depositModel.createSolicitacaoDeposito).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Usuário não possui configuração de recebimento. Por favor, configure antes de solicitar um depósito.",
      });
    });

    it("deve retornar erro 500 ao falhar na criação", async () => {
      const mockUser = { user_id: "user123" };
      const mockCampanha = { campanha_id: "camp123" };
      const mockCampanhaExists = {
        campanha_id: "camp123",
        value_donated: 5000,
      };
      const mockValidation = { user_id: "user123", status: "APPROVED" };
      const mockConfigReceipt = { config_id: "config123" };

      req.body = { user: mockUser, campanha: mockCampanha };

      campanhaModel.findById.mockResolvedValue(mockCampanhaExists);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);
      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
        mockConfigReceipt
      );
      depositModel.createSolicitacaoDeposito.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await depositController.createSolicitacaoDeposito(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível criar a solicitação de depósito",
      });
    });
  });

  describe("getMySolicitacoesDeposito", () => {
    it("deve retornar solicitações de depósito do usuário", async () => {
      const mockDeposits = [
        {
          request_id: "req1",
          user: { user_id: "user123" },
          status: "PENDING",
        },
        {
          request_id: "req2",
          user: { user_id: "user123" },
          status: "COMPLETED",
        },
      ];

      req.params = { user_id: "user123" };

      depositModel.getMySolicitacoesDeposito.mockResolvedValue({
        Items: mockDeposits,
      });

      await depositController.getMySolicitacoesDeposito(req, res);

      expect(depositModel.getMySolicitacoesDeposito).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDeposits);
    });

    it("deve retornar array vazio quando não há solicitações", async () => {
      req.params = { user_id: "user123" };

      depositModel.getMySolicitacoesDeposito.mockResolvedValue({
        Items: [],
      });

      await depositController.getMySolicitacoesDeposito(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar array vazio quando result é null", async () => {
      req.params = { user_id: "user123" };

      depositModel.getMySolicitacoesDeposito.mockResolvedValue(null);

      await depositController.getMySolicitacoesDeposito(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };

      depositModel.getMySolicitacoesDeposito.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await depositController.getMySolicitacoesDeposito(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar as solicitações de depósito",
      });
    });
  });

  describe("updateSolicitacaoDepositoStatus", () => {
    it("deve atualizar status para COMPLETED quando usuário é admin", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };
      const mockResult = {
        request_id: "req123",
        status: "COMPLETED",
      };

      req.body = {
        request_id: "req123",
        user_id: "admin123",
        new_status: "COMPLETED",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.updateSolicitacaoDepositoStatus.mockResolvedValue(
        mockResult
      );

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(depositModel.updateSolicitacaoDepositoStatus).toHaveBeenCalledWith(
        "req123",
        "COMPLETED",
        undefined
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve atualizar status para REJECTED com justificativa", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };
      const mockResult = {
        request_id: "req123",
        status: "REJECTED",
        justification_admin: "Dados bancários incorretos",
      };

      req.body = {
        request_id: "req123",
        user_id: "admin123",
        new_status: "REJECTED",
        justification_admin: "Dados bancários incorretos",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.updateSolicitacaoDepositoStatus.mockResolvedValue(
        mockResult
      );

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(depositModel.updateSolicitacaoDepositoStatus).toHaveBeenCalledWith(
        "req123",
        "REJECTED",
        "Dados bancários incorretos"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve negar acesso quando usuário não é admin", async () => {
      const mockUser = { user_id: "user123", admin: false };

      req.body = {
        request_id: "req123",
        user_id: "user123",
        new_status: "COMPLETED",
      };

      userModel.findById.mockResolvedValue(mockUser);

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(
        depositModel.updateSolicitacaoDepositoStatus
      ).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
    });

    it("deve negar acesso quando usuário não existe", async () => {
      req.body = {
        request_id: "req123",
        user_id: "user999",
        new_status: "COMPLETED",
      };

      userModel.findById.mockResolvedValue(null);

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(
        depositModel.updateSolicitacaoDepositoStatus
      ).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
    });

    it("deve retornar erro 400 quando REJECTED sem justificativa", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.body = {
        request_id: "req123",
        user_id: "admin123",
        new_status: "REJECTED",
        // falta justification_admin
      };

      userModel.findById.mockResolvedValue(mockAdmin);

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(
        depositModel.updateSolicitacaoDepositoStatus
      ).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Justificativa é obrigatória para rejeição",
      });
    });

    it("deve retornar erro 404 quando solicitação não existe", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.body = {
        request_id: "req999",
        user_id: "admin123",
        new_status: "COMPLETED",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.updateSolicitacaoDepositoStatus.mockResolvedValue(null);

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Solicitação de depósito não encontrada",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.body = {
        request_id: "req123",
        user_id: "admin123",
        new_status: "COMPLETED",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.updateSolicitacaoDepositoStatus.mockRejectedValue(
        new Error("Erro")
      );

      await depositController.updateSolicitacaoDepositoStatus(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível atualizar o status da solicitação de depósito",
      });
    });
  });

  describe("getSolicitacoesDepositoPendingAdmin", () => {
    it("deve retornar solicitações pendentes quando usuário é admin", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };
      const mockPendingDeposits = [
        { request_id: "req1", status: "PENDING" },
        { request_id: "req2", status: "PENDING" },
      ];

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.getSolicitacoesDepositoPendingAdmin.mockResolvedValue({
        Items: mockPendingDeposits,
      });

      await depositController.getSolicitacoesDepositoPendingAdmin(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(
        depositModel.getSolicitacoesDepositoPendingAdmin
      ).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPendingDeposits);
    });

    it("deve retornar lista vazia quando não há solicitações pendentes", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.getSolicitacoesDepositoPendingAdmin.mockResolvedValue({
        Items: [],
      });

      await depositController.getSolicitacoesDepositoPendingAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve negar acesso quando usuário não é admin", async () => {
      const mockUser = { user_id: "user123", admin: false };

      req.params = { user_id: "user123" };

      userModel.findById.mockResolvedValue(mockUser);

      await depositController.getSolicitacoesDepositoPendingAdmin(req, res);

      expect(
        depositModel.getSolicitacoesDepositoPendingAdmin
      ).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
    });

    it("deve negar acesso quando usuário não existe", async () => {
      req.params = { user_id: "user999" };

      userModel.findById.mockResolvedValue(null);

      await depositController.getSolicitacoesDepositoPendingAdmin(req, res);

      expect(
        depositModel.getSolicitacoesDepositoPendingAdmin
      ).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      depositModel.getSolicitacoesDepositoPendingAdmin.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await depositController.getSolicitacoesDepositoPendingAdmin(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar as solicitações de depósito",
      });
    });
  });

  describe("Testes de integração", () => {
    it("deve criar solicitação e depois buscar", async () => {
      const mockUser = { user_id: "user123", username: "João" };
      const mockCampanha = { campanha_id: "camp123", value_donated: 5000 };
      const mockCampanhaExists = {
        campanha_id: "camp123",
        value_donated: 5000,
      };
      const mockValidation = { status: "APPROVED" };
      const mockConfigReceipt = { config_id: "config123" };
      const mockCreateResult = {
        request_id: "req123",
        status: "PENDING",
      };

      // Criar solicitação
      req.body = { user: mockUser, campanha: mockCampanha };

      campanhaModel.findById.mockResolvedValue(mockCampanhaExists);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);
      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
        mockConfigReceipt
      );
      depositModel.createSolicitacaoDeposito.mockResolvedValue(
        mockCreateResult
      );
      campanhaModel.updateStatusCampanha.mockResolvedValue({});

      await depositController.createSolicitacaoDeposito(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCreateResult);

      // Reset mocks
      jest.clearAllMocks();

      // Buscar solicitações
      req.params = { user_id: "user123" };

      depositModel.getMySolicitacoesDeposito.mockResolvedValue({
        Items: [mockCreateResult],
      });

      await depositController.getMySolicitacoesDeposito(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([mockCreateResult]);
    });
  });
});
