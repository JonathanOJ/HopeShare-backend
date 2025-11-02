const configReceiptController = require("../configReceiptController");
const configReceiptModel = require("../../models/configReceiptModel");
const userModel = require("../../models/userModel");
const validationUserModel = require("../../models/validationUserModel");

// Mock dos modelos
jest.mock("../../models/configReceiptModel");
jest.mock("../../models/userModel");
jest.mock("../../models/validationUserModel");

describe("configReceiptController", () => {
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

  describe("saveConfigReceipt", () => {
    it("deve criar nova configuração quando não existe", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        cnpj_verified: false,
      };

      const mockConfigData = {
        user_id: "user123",
        receipt_type: "PIX",
        pix_key: "joao@example.com",
        pix_type: "EMAIL",
      };

      const mockResult = {
        Attributes: {
          config_id: "config123",
          user_id: "user123",
          receipt_type: "PIX",
          pix_key: "joao@example.com",
          pix_type: "EMAIL",
        },
      };

      req.body = mockConfigData;

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.saveConfigReceipt.mockResolvedValue(mockResult);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(configReceiptModel.getConfigReceiptByUserId).toHaveBeenCalledWith(
        "user123"
      );
      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(configReceiptModel.saveConfigReceipt).toHaveBeenCalledWith(
        mockConfigData,
        false
      );
      expect(configReceiptModel.updateConfigReceipt).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult.Attributes);
    });

    it("deve atualizar configuração existente", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        cnpj_verified: true,
      };

      const mockExistingConfig = {
        config_id: "config123",
        user_id: "user123",
        receipt_type: "PIX",
      };

      const mockUpdateData = {
        user_id: "user123",
        receipt_type: "BANK",
        bank_name: "Banco do Brasil",
        agency: "1234",
        account: "567890",
      };

      const mockResult = {
        Attributes: {
          config_id: "config123",
          ...mockUpdateData,
        },
      };

      req.body = mockUpdateData;

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
        mockExistingConfig
      );
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.updateConfigReceipt.mockResolvedValue(mockResult);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(configReceiptModel.getConfigReceiptByUserId).toHaveBeenCalledWith(
        "user123"
      );
      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(configReceiptModel.updateConfigReceipt).toHaveBeenCalledWith(
        "config123",
        mockUpdateData
      );
      expect(configReceiptModel.saveConfigReceipt).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult.Attributes);
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.body = {
        user_id: "user999",
        receipt_type: "PIX",
      };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(null);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user999");
      expect(configReceiptModel.saveConfigReceipt).not.toHaveBeenCalled();
      expect(configReceiptModel.updateConfigReceipt).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve criar configuração com cnpj_verified true quando verificado", async () => {
      const mockUser = {
        user_id: "user123",
        username: "Empresa LTDA",
        cnpj_verified: true,
      };

      const mockConfigData = {
        user_id: "user123",
        receipt_type: "BANK",
        bank_name: "Itaú",
      };

      const mockResult = {
        Attributes: {
          config_id: "config123",
          ...mockConfigData,
          cnpj_verified: true,
        },
      };

      req.body = mockConfigData;

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.saveConfigReceipt.mockResolvedValue(mockResult);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(configReceiptModel.saveConfigReceipt).toHaveBeenCalledWith(
        mockConfigData,
        true
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar erro 500 ao falhar na criação", async () => {
      const mockUser = { user_id: "user123", cnpj_verified: false };

      req.body = { user_id: "user123", receipt_type: "PIX" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.saveConfigReceipt.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await configReceiptController.saveConfigReceipt(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível salvar configuração de recebimento",
      });
    });

    it("deve retornar erro 500 ao falhar na atualização", async () => {
      const mockUser = { user_id: "user123", cnpj_verified: false };
      const mockExistingConfig = { config_id: "config123", user_id: "user123" };

      req.body = { user_id: "user123", receipt_type: "BANK" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
        mockExistingConfig
      );
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.updateConfigReceipt.mockRejectedValue(
        new Error("Erro ao atualizar")
      );

      await configReceiptController.saveConfigReceipt(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível salvar configuração de recebimento",
      });
    });

    it("deve tratar cnpj_verified undefined como false", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        // cnpj_verified não definido
      };

      const mockConfigData = {
        user_id: "user123",
        receipt_type: "PIX",
      };

      const mockResult = {
        Attributes: {
          config_id: "config123",
          ...mockConfigData,
        },
      };

      req.body = mockConfigData;

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.saveConfigReceipt.mockResolvedValue(mockResult);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(configReceiptModel.saveConfigReceipt).toHaveBeenCalledWith(
        mockConfigData,
        false
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getConfigReceiptByUserId", () => {
    it("deve retornar configuração com cnpj_verified true quando aprovado", async () => {
      const mockConfig = {
        config_id: "config123",
        user_id: "user123",
        receipt_type: "PIX",
        pix_key: "joao@example.com",
      };

      const mockValidation = {
        user_id: "user123",
        status: "APPROVED",
      };

      req.params = { user_id: "user123" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(mockConfig);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(configReceiptModel.getConfigReceiptByUserId).toHaveBeenCalledWith(
        "user123"
      );
      expect(validationUserModel.getValidationUser).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockConfig,
        cnpj_verified: true,
      });
    });

    it("deve retornar configuração com cnpj_verified false quando não aprovado", async () => {
      const mockConfig = {
        config_id: "config123",
        user_id: "user123",
        receipt_type: "BANK",
      };

      const mockValidation = {
        user_id: "user123",
        status: "PENDING",
      };

      req.params = { user_id: "user123" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(mockConfig);
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockConfig,
        cnpj_verified: false,
      });
    });

    it("deve retornar configuração com cnpj_verified false quando não há validação", async () => {
      const mockConfig = {
        config_id: "config123",
        user_id: "user123",
        receipt_type: "PIX",
      };

      req.params = { user_id: "user123" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(mockConfig);
      validationUserModel.getValidationUser.mockResolvedValue(null);

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(validationUserModel.getValidationUser).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockConfig,
        cnpj_verified: false,
      });
    });

    it("deve retornar null quando configuração não existe", async () => {
      req.params = { user_id: "user999" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(configReceiptModel.getConfigReceiptByUserId).toHaveBeenCalledWith(
        "user999"
      );
      expect(validationUserModel.getValidationUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(null);
    });

    it("deve retornar erro 500 ao falhar na busca da configuração", async () => {
      req.params = { user_id: "user123" };

      configReceiptModel.getConfigReceiptByUserId.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar configuração de recebimento do usuário",
      });
    });

    it("deve retornar erro 500 ao falhar na busca da validação", async () => {
      const mockConfig = {
        config_id: "config123",
        user_id: "user123",
        receipt_type: "PIX",
      };

      req.params = { user_id: "user123" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(mockConfig);
      validationUserModel.getValidationUser.mockRejectedValue(
        new Error("Erro ao buscar validação")
      );

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar configuração de recebimento do usuário",
      });
    });

    it("deve buscar configuração com diferentes tipos de recebimento", async () => {
      const mockConfigs = [
        {
          config_id: "config1",
          user_id: "user123",
          receipt_type: "PIX",
          pix_key: "11999999999",
          pix_type: "PHONE",
        },
        {
          config_id: "config2",
          user_id: "user123",
          receipt_type: "BANK",
          bank_name: "Santander",
          agency: "0001",
          account: "123456",
          account_type: "CORRENTE",
        },
      ];

      for (const mockConfig of mockConfigs) {
        jest.clearAllMocks();

        req.params = { user_id: "user123" };

        configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
          mockConfig
        );
        validationUserModel.getValidationUser.mockResolvedValue({
          status: "APPROVED",
        });

        await configReceiptController.getConfigReceiptByUserId(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          ...mockConfig,
          cnpj_verified: true,
        });
      }
    });
  });

  describe("Testes de integração", () => {
    it("deve criar e depois buscar configuração", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        cnpj_verified: false,
      };

      const mockConfigData = {
        user_id: "user123",
        receipt_type: "PIX",
        pix_key: "joao@example.com",
      };

      const mockSaveResult = {
        Attributes: {
          config_id: "config123",
          ...mockConfigData,
        },
      };

      // Primeiro: salvar configuração
      req.body = mockConfigData;

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.saveConfigReceipt.mockResolvedValue(mockSaveResult);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSaveResult.Attributes);

      // Resetar mocks para o próximo teste
      jest.clearAllMocks();

      // Segundo: buscar configuração criada
      req.params = { user_id: "user123" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(
        mockSaveResult.Attributes
      );
      validationUserModel.getValidationUser.mockResolvedValue(null);

      await configReceiptController.getConfigReceiptByUserId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockSaveResult.Attributes,
        cnpj_verified: false,
      });
    });
  });

  describe("Testes de edge cases", () => {
    it("deve lidar com user_id vazio", async () => {
      req.body = { user_id: "", receipt_type: "PIX" };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(null);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve lidar com dados de configuração incompletos", async () => {
      const mockUser = { user_id: "user123", cnpj_verified: false };

      req.body = { user_id: "user123" }; // falta receipt_type

      const mockResult = {
        Attributes: {
          config_id: "config123",
          user_id: "user123",
        },
      };

      configReceiptModel.getConfigReceiptByUserId.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      configReceiptModel.saveConfigReceipt.mockResolvedValue(mockResult);

      await configReceiptController.saveConfigReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult.Attributes);
    });
  });
});
