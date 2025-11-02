const validationUserController = require("../validationUserController");
const validationUserModel = require("../../models/validationUserModel");
const userModel = require("../../models/userModel");

// Mock dos modelos
jest.mock("../../models/validationUserModel");
jest.mock("../../models/userModel");

describe("validationUserController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      files: [],
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getValidationUser", () => {
    it("deve retornar validação do usuário com sucesso", async () => {
      const mockValidation = {
        validation_id: "123456789",
        user: {
          user_id: "user123",
          name: "João Silva",
          email: "joao@email.com",
        },
        status: "PENDING",
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
        documents: [],
      };

      req.params.user_id = "user123";
      validationUserModel.getValidationUser.mockResolvedValue(mockValidation);

      await validationUserController.getValidationUser(req, res);

      expect(validationUserModel.getValidationUser).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockValidation);
    });

    it("deve retornar erro 500 se houver falha ao buscar validação", async () => {
      req.params.user_id = "user123";
      validationUserModel.getValidationUser.mockRejectedValue(
        new Error("Erro ao buscar")
      );

      await validationUserController.getValidationUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar validação do usuário",
      });
    });
  });

  describe("saveValidationUser", () => {
    it("deve criar nova validação com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        name: "João Silva",
        email: "joao@email.com",
      };

      const mockResult = {
        validation_id: "123456789",
        user: mockUser,
        status: "PENDING",
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
        documents: [],
        success: true,
      };

      req.body = {
        user: mockUser,
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
        observation: "Teste",
      };

      validationUserModel.getValidationUser.mockResolvedValue(null);
      validationUserModel.createValidationUser.mockResolvedValue(mockResult);

      await validationUserController.saveValidationUser(req, res);

      expect(validationUserModel.createValidationUser).toHaveBeenCalledWith({
        user: mockUser,
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
        observation: "Teste",
        documents: [],
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Validação criada com sucesso",
        data: mockResult,
      });
    });

    it("deve atualizar validação existente com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        name: "João Silva",
        email: "joao@email.com",
      };

      const mockExisting = {
        validation_id: "123456789",
        user: mockUser,
        status: "PENDING",
      };

      const mockUpdated = {
        ...mockExisting,
        company_name: "Empresa ABC",
        cnpj: "98765432109876",
      };

      req.body = {
        user: mockUser,
        company_name: "Empresa ABC",
        cnpj: "98765432109876",
      };

      validationUserModel.getValidationUser.mockResolvedValue(mockExisting);
      validationUserModel.updateValidationUser.mockResolvedValue(mockUpdated);

      await validationUserController.saveValidationUser(req, res);

      expect(validationUserModel.updateValidationUser).toHaveBeenCalledWith(
        "user123",
        {
          user: mockUser,
          company_name: "Empresa ABC",
          cnpj: "98765432109876",
          observation: "",
          documents: [],
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Registro de validação atualizado. Aguardando revisão.",
        data: mockUpdated,
      });
    });

    it("deve processar documentos enviados via multipart/form-data", async () => {
      const mockUser = {
        user_id: "user123",
        name: "João Silva",
      };

      const mockFiles = [
        {
          fieldname: "documents",
          originalname: "documento1.pdf",
          mimetype: "application/pdf",
          buffer: Buffer.from("file content 1"),
        },
        {
          fieldname: "documents",
          originalname: "documento2.jpg",
          mimetype: "image/jpeg",
          buffer: Buffer.from("file content 2"),
        },
      ];

      req.body = {
        user: mockUser,
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
      };
      req.files = mockFiles;

      const mockResult = {
        validation_id: "123456789",
        user: mockUser,
        documents: [
          { name: "documento1.pdf", url: "https://s3.../documento1.pdf" },
          { name: "documento2.jpg", url: "https://s3.../documento2.jpg" },
        ],
      };

      validationUserModel.getValidationUser.mockResolvedValue(null);
      validationUserModel.createValidationUser.mockResolvedValue(mockResult);

      await validationUserController.saveValidationUser(req, res);

      expect(validationUserModel.createValidationUser).toHaveBeenCalledWith({
        user: mockUser,
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
        observation: "",
        documents: [
          {
            name: "documento1.pdf",
            type: "application/pdf",
            file: expect.any(Buffer),
          },
          {
            name: "documento2.jpg",
            type: "image/jpeg",
            file: expect.any(Buffer),
          },
        ],
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("deve fazer parse de user quando enviado como string JSON", async () => {
      const mockUser = {
        user_id: "user123",
        name: "João Silva",
      };

      req.body = {
        user: JSON.stringify(mockUser),
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
      };

      validationUserModel.getValidationUser.mockResolvedValue(null);
      validationUserModel.createValidationUser.mockResolvedValue({
        validation_id: "123456789",
        user: mockUser,
      });

      await validationUserController.saveValidationUser(req, res);

      expect(validationUserModel.createValidationUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("deve retornar erro 400 se user não for fornecido", async () => {
      req.body = {
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
      };

      await validationUserController.saveValidationUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "user é obrigatório",
      });
    });

    it("deve retornar erro 500 se parse do user falhar", async () => {
      req.body = {
        user: "invalid json string",
        company_name: "Empresa XYZ",
      };

      await validationUserController.saveValidationUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível processar a validação",
        details: "Formato inválido para o campo user",
      });
    });

    it("deve usar observation vazia se não fornecida", async () => {
      const mockUser = {
        user_id: "user123",
        name: "João Silva",
      };

      req.body = {
        user: mockUser,
        company_name: "Empresa XYZ",
        cnpj: "12345678901234",
      };

      validationUserModel.getValidationUser.mockResolvedValue(null);
      validationUserModel.createValidationUser.mockResolvedValue({
        validation_id: "123456789",
        user: mockUser,
      });

      await validationUserController.saveValidationUser(req, res);

      expect(validationUserModel.createValidationUser).toHaveBeenCalledWith(
        expect.objectContaining({
          observation: "",
        })
      );
    });

    it("deve retornar erro 500 se falhar ao criar validação", async () => {
      req.body = {
        user: { user_id: "user123" },
        company_name: "Empresa XYZ",
      };

      validationUserModel.getValidationUser.mockResolvedValue(null);
      validationUserModel.createValidationUser.mockRejectedValue(
        new Error("Erro ao criar")
      );

      await validationUserController.saveValidationUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível processar a validação",
        details: "Erro ao criar",
      });
    });
  });

  describe("updateValidationAdmin", () => {
    it("deve atualizar validação como admin com sucesso", async () => {
      const mockAdmin = {
        user_id: "admin123",
        name: "Admin User",
        admin: true,
      };

      const mockValidation = {
        validation_id: "val123",
        user: { user_id: "user123" },
        status: "PENDING",
      };

      const mockUpdated = {
        ...mockValidation,
        status: "APPROVED",
        observation: "Documentos aprovados",
      };

      req.params.user_id = "admin123";
      req.body = {
        validation_id: "val123",
        status: "APPROVED",
        observation: "Documentos aprovados",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      validationUserModel.getValidationById.mockResolvedValue(mockValidation);
      validationUserModel.updateValidationAdmin.mockResolvedValue(mockUpdated);

      await validationUserController.updateValidationAdmin(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(validationUserModel.getValidationById).toHaveBeenCalledWith(
        "val123"
      );
      expect(validationUserModel.updateValidationAdmin).toHaveBeenCalledWith(
        "val123",
        {
          status: "APPROVED",
          observation: "Documentos aprovados",
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
    });

    it("deve rejeitar validação com observação como admin", async () => {
      const mockAdmin = {
        user_id: "admin123",
        admin: true,
      };

      const mockValidation = {
        validation_id: "val123",
        status: "PENDING",
      };

      const mockUpdated = {
        ...mockValidation,
        status: "REJECTED",
        observation: "Documentos incompletos",
      };

      req.params.user_id = "admin123";
      req.body = {
        validation_id: "val123",
        status: "REJECTED",
        observation: "Documentos incompletos",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      validationUserModel.getValidationById.mockResolvedValue(mockValidation);
      validationUserModel.updateValidationAdmin.mockResolvedValue(mockUpdated);

      await validationUserController.updateValidationAdmin(req, res);

      expect(validationUserModel.updateValidationAdmin).toHaveBeenCalledWith(
        "val123",
        {
          status: "REJECTED",
          observation: "Documentos incompletos",
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
    });

    it("deve retornar erro 401 se usuário não for admin", async () => {
      const mockUser = {
        user_id: "user123",
        name: "Regular User",
        admin: false,
      };

      req.params.user_id = "user123";
      req.body = {
        validation_id: "val123",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(mockUser);

      await validationUserController.updateValidationAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
      expect(validationUserModel.updateValidationAdmin).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 se usuário não existir", async () => {
      req.params.user_id = "invalid123";
      req.body = {
        validation_id: "val123",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(null);

      await validationUserController.updateValidationAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
    });

    it("deve retornar erro 404 se validação não existir", async () => {
      const mockAdmin = {
        user_id: "admin123",
        admin: true,
      };

      req.params.user_id = "admin123";
      req.body = {
        validation_id: "invalid_val",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      validationUserModel.getValidationById.mockResolvedValue(null);

      await validationUserController.updateValidationAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Registro de validação não encontrado",
      });
      expect(validationUserModel.updateValidationAdmin).not.toHaveBeenCalled();
    });

    it("deve retornar erro 500 se houver falha ao atualizar", async () => {
      const mockAdmin = {
        user_id: "admin123",
        admin: true,
      };

      req.params.user_id = "admin123";
      req.body = {
        validation_id: "val123",
        status: "APPROVED",
      };

      userModel.findById.mockRejectedValue(new Error("Erro ao buscar admin"));

      await validationUserController.updateValidationAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível atualizar o registro de validação",
      });
    });
  });

  describe("getPendingValidations", () => {
    it("deve retornar validações pendentes como admin", async () => {
      const mockAdmin = {
        user_id: "admin123",
        name: "Admin User",
        admin: true,
      };

      const mockPendingValidations = [
        {
          validation_id: "val1",
          user: { user_id: "user1", name: "João" },
          status: "PENDING",
          company_name: "Empresa A",
        },
        {
          validation_id: "val2",
          user: { user_id: "user2", name: "Maria" },
          status: "PENDING",
          company_name: "Empresa B",
        },
      ];

      req.params.user_id = "admin123";

      userModel.findById.mockResolvedValue(mockAdmin);
      validationUserModel.getPendingValidations.mockResolvedValue(
        mockPendingValidations
      );

      await validationUserController.getPendingValidations(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(validationUserModel.getPendingValidations).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPendingValidations);
    });

    it("deve retornar array vazio se não houver validações pendentes", async () => {
      const mockAdmin = {
        user_id: "admin123",
        admin: true,
      };

      req.params.user_id = "admin123";

      userModel.findById.mockResolvedValue(mockAdmin);
      validationUserModel.getPendingValidations.mockResolvedValue([]);

      await validationUserController.getPendingValidations(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 401 se usuário não for admin", async () => {
      const mockUser = {
        user_id: "user123",
        name: "Regular User",
        admin: false,
      };

      req.params.user_id = "user123";

      userModel.findById.mockResolvedValue(mockUser);

      await validationUserController.getPendingValidations(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
      expect(validationUserModel.getPendingValidations).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 se usuário não existir", async () => {
      req.params.user_id = "invalid123";

      userModel.findById.mockResolvedValue(null);

      await validationUserController.getPendingValidations(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado. Apenas administradores.",
      });
    });

    it("deve retornar erro 500 se houver falha ao buscar validações", async () => {
      const mockAdmin = {
        user_id: "admin123",
        admin: true,
      };

      req.params.user_id = "admin123";

      userModel.findById.mockResolvedValue(mockAdmin);
      validationUserModel.getPendingValidations.mockRejectedValue(
        new Error("Erro ao buscar")
      );

      await validationUserController.getPendingValidations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar validações pendentes",
      });
    });
  });
});
