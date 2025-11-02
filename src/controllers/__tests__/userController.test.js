const userController = require("../userController");
const userModel = require("../../models/userModel");

// Mock do modelo
jest.mock("../../models/userModel");

describe("userController", () => {
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

  describe("findByEmail", () => {
    it("deve buscar usuário por email com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        email: "joao@example.com",
        username: "João Silva",
        type_user: 2,
        admin: false,
        image: "https://example.com/image.jpg",
        cpf: "12345678900",
        password: "hashed_password",
      };

      req.params = { email: "joao@example.com" };

      userModel.findByEmail.mockResolvedValue(mockUser);

      await userController.findByEmail(req, res);

      expect(userModel.findByEmail).toHaveBeenCalledWith(req.params);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user_id: "user123",
        email: "joao@example.com",
        username: "João Silva",
        type_user: 2,
        admin: false,
        image: "https://example.com/image.jpg",
        cpf: "12345678900",
        cnpj: null,
      });
      // Senha não deve estar na resposta
      expect(res.json.mock.calls[0][0]).not.toHaveProperty("password");
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.params = { email: "naoexiste@example.com" };

      userModel.findByEmail.mockResolvedValue(null);

      await userController.findByEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { email: "joao@example.com" };

      userModel.findByEmail.mockRejectedValue(new Error("Erro no banco"));

      await userController.findByEmail(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar usuário",
      });
    });
  });

  describe("findByCnpj", () => {
    it("deve buscar usuário por CNPJ com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        email: "empresa@example.com",
        username: "Empresa LTDA",
        type_user: 1,
        cnpj: "12345678000199",
        password: "hashed_password",
      };

      req.params = { cnpj: "12345678000199" };

      userModel.findByCnpj.mockResolvedValue(mockUser);

      await userController.findByCnpj(req, res);

      expect(userModel.findByCnpj).toHaveBeenCalledWith("12345678000199");
      expect(res.status).toHaveBeenCalledWith(200);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty("cnpj", "12345678000199");
      expect(response).not.toHaveProperty("password");
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.params = { cnpj: "99999999000199" };

      userModel.findByCnpj.mockResolvedValue(null);

      await userController.findByCnpj(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { cnpj: "12345678000199" };

      userModel.findByCnpj.mockRejectedValue(new Error("Erro"));

      await userController.findByCnpj(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("findByCpf", () => {
    it("deve buscar usuário por CPF com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        email: "pessoa@example.com",
        cpf: "12345678900",
        password: "hashed_password",
      };

      req.params = { cpf: "12345678900" };

      userModel.findByCpf.mockResolvedValue(mockUser);

      await userController.findByCpf(req, res);

      expect(userModel.findByCpf).toHaveBeenCalledWith("12345678900");
      expect(res.status).toHaveBeenCalledWith(200);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty("cpf", "12345678900");
      expect(response).not.toHaveProperty("password");
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.params = { cpf: "99999999999" };

      userModel.findByCpf.mockResolvedValue(null);

      await userController.findByCpf(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { cpf: "12345678900" };

      userModel.findByCpf.mockRejectedValue(new Error("Erro"));

      await userController.findByCpf(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("findById", () => {
    it("deve buscar usuário por ID com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        email: "joao@example.com",
        username: "João Silva",
        password: "hashed_password",
      };

      req.params = { user_id: "user123" };

      userModel.findById.mockResolvedValue(mockUser);

      await userController.findById(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty("user_id", "user123");
      expect(response).not.toHaveProperty("password");
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.params = { user_id: "user999" };

      userModel.findById.mockResolvedValue(null);

      await userController.findById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };

      userModel.findById.mockRejectedValue(new Error("Erro"));

      await userController.findById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("signIn", () => {
    it("deve fazer login com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        email: "joao@example.com",
        username: "João Silva",
        type_user: 2,
        admin: false,
        image: null,
        cpf: "12345678900",
        cnpj: null,
      };

      req.body = {
        email: "joao@example.com",
        password: "senha123",
      };

      userModel.signIn.mockResolvedValue(mockUser);

      await userController.signIn(req, res);

      expect(userModel.signIn).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user_id: "user123",
        email: "joao@example.com",
        username: "João Silva",
        type_user: 2,
        admin: false,
        image: null,
        cpf: "12345678900",
        cnpj: null,
      });
    });

    it("deve retornar erro 401 quando credenciais são inválidas", async () => {
      req.body = {
        email: "joao@example.com",
        password: "senhaerrada",
      };

      userModel.signIn.mockResolvedValue(null);

      await userController.signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "E-mail ou senha inválidos",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.body = {
        email: "joao@example.com",
        password: "senha123",
      };

      userModel.signIn.mockRejectedValue(new Error("Erro"));

      await userController.signIn(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível fazer login",
      });
    });
  });

  describe("saveUser", () => {
    describe("criar novo usuário", () => {
      it("deve criar usuário pessoa física com sucesso", async () => {
        const mockCreatedUser = {
          user_id: "user123",
          email: "novo@example.com",
          username: "Novo Usuário",
          type_user: 2,
          cpf: "12345678900",
        };

        req.body = {
          email: "novo@example.com",
          username: "Novo Usuário",
          password: "senha123",
          type_user: 2,
          cpf: "12345678900",
        };

        userModel.findByEmail.mockResolvedValue(null);
        userModel.findByCpf.mockResolvedValue(null);
        userModel.createUser.mockResolvedValue(mockCreatedUser);

        await userController.saveUser(req, res);

        expect(userModel.findByEmail).toHaveBeenCalledWith("novo@example.com");
        expect(userModel.findByCpf).toHaveBeenCalledWith("12345678900");
        expect(userModel.createUser).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockCreatedUser);
      });

      it("deve criar usuário empresa com CNPJ com sucesso", async () => {
        const mockCreatedUser = {
          user_id: "user123",
          email: "empresa@example.com",
          type_user: 1,
          cnpj: "12345678000199",
        };

        req.body = {
          email: "empresa@example.com",
          password: "senha123",
          type_user: 1,
          cnpj: "12345678000199",
        };

        userModel.findByEmail.mockResolvedValue(null);
        userModel.findByCnpj.mockResolvedValue(null);
        userModel.createUser.mockResolvedValue(mockCreatedUser);

        await userController.saveUser(req, res);

        expect(userModel.findByCnpj).toHaveBeenCalledWith("12345678000199");
        expect(res.status).toHaveBeenCalledWith(201);
      });

      it("deve retornar erro 400 quando email já existe", async () => {
        req.body = {
          email: "existente@example.com",
          password: "senha123",
        };

        userModel.findByEmail.mockResolvedValue({ user_id: "user456" });

        await userController.saveUser(req, res);

        expect(userModel.createUser).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "E-mail já está em uso",
        });
      });

      it("deve retornar erro 400 quando CNPJ falta para empresa", async () => {
        req.body = {
          email: "empresa@example.com",
          password: "senha123",
          type_user: 1,
          // sem cnpj
        };

        userModel.findByEmail.mockResolvedValue(null);

        await userController.saveUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "CNPJ é obrigatório para usuários do tipo EMPRESA",
        });
      });

      it("deve retornar erro 400 quando CNPJ já existe", async () => {
        req.body = {
          email: "empresa@example.com",
          type_user: 1,
          cnpj: "12345678000199",
        };

        userModel.findByEmail.mockResolvedValue(null);
        userModel.findByCnpj.mockResolvedValue({ user_id: "user789" });

        await userController.saveUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "CNPJ já está em uso",
        });
      });

      it("deve retornar erro 400 quando CPF falta para pessoa física", async () => {
        req.body = {
          email: "pessoa@example.com",
          password: "senha123",
          type_user: 2,
          // sem cpf
        };

        userModel.findByEmail.mockResolvedValue(null);

        await userController.saveUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "CPF é obrigatório para usuários do tipo PESSOA FÍSICA",
        });
      });

      it("deve retornar erro 400 quando CPF já existe", async () => {
        req.body = {
          email: "pessoa@example.com",
          type_user: 2,
          cpf: "12345678900",
        };

        userModel.findByEmail.mockResolvedValue(null);
        userModel.findByCpf.mockResolvedValue({ user_id: "user789" });

        await userController.saveUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "CPF já está em uso",
        });
      });

      it("deve retornar erro 500 ao falhar na criação", async () => {
        req.body = {
          email: "novo@example.com",
          type_user: 2,
          cpf: "12345678900",
        };

        userModel.findByEmail.mockResolvedValue(null);
        userModel.findByCpf.mockResolvedValue(null);
        userModel.createUser.mockRejectedValue(new Error("Erro no banco"));

        await userController.saveUser(req, res);

        expect(console.error).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Não foi possível criar usuário",
        });
      });
    });

    describe("atualizar usuário existente", () => {
      it("deve atualizar usuário com sucesso", async () => {
        const mockUpdatedUser = {
          user_id: "user123",
          email: "atualizado@example.com",
          image: "nova_imagem.jpg",
          type_user: 2,
          admin: false,
        };

        req.body = {
          user_id: "user123",
          email: "atualizado@example.com",
          image: "nova_imagem.jpg",
        };

        userModel.updateUser.mockResolvedValue(mockUpdatedUser);

        await userController.saveUser(req, res);

        expect(userModel.updateUser).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          user_id: "user123",
          email: "atualizado@example.com",
          image: "nova_imagem.jpg",
          type_user: 2,
          admin: false,
        });
      });

      it("deve retornar erro 500 ao falhar na atualização", async () => {
        req.body = {
          user_id: "user123",
          email: "atualizado@example.com",
        };

        userModel.updateUser.mockRejectedValue(new Error("Erro"));

        await userController.saveUser(req, res);

        expect(console.error).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Não foi possível atualizar usuário",
        });
      });
    });
  });

  describe("updateUserCampanhasCreated", () => {
    it("deve atualizar contador de campanhas criadas com sucesso", async () => {
      const mockResult = {
        Attributes: {
          user_id: "user123",
          campanhas_created: 5,
        },
      };

      req.params = { user_id: "user123" };

      userModel.updateUserCampanhaCreated.mockResolvedValue(mockResult);

      await userController.updateUserCampanhasCreated(req, res);

      expect(userModel.updateUserCampanhaCreated).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult.Attributes);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };

      userModel.updateUserCampanhaCreated.mockRejectedValue(new Error("Erro"));

      await userController.updateUserCampanhasCreated(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível atualizar usuário",
      });
    });
  });

  describe("deleteUser", () => {
    it("deve deletar usuário com sucesso", async () => {
      const mockResult = {
        Attributes: {
          user_id: "user123",
          deleted: true,
        },
      };

      req.params = { user_id: "user123" };

      userModel.deleteUser.mockResolvedValue(mockResult);

      await userController.deleteUser(req, res);

      expect(userModel.deleteUser).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.params = { user_id: "user999" };

      userModel.deleteUser.mockResolvedValue({});

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };

      userModel.deleteUser.mockRejectedValue(new Error("Erro"));

      await userController.deleteUser(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível deletar usuário",
      });
    });
  });

  describe("getDetailsCampanhasByUsuarioId", () => {
    it("deve buscar detalhes das campanhas do usuário com sucesso", async () => {
      const mockDetails = {
        user_id: "user123",
        campanhas: [
          { campanha_id: "camp1", title: "Campanha 1" },
          { campanha_id: "camp2", title: "Campanha 2" },
        ],
        total_campanhas: 2,
      };

      req.params = { user_id: "user123" };

      userModel.getDetailsCampanhasByUsuarioId.mockResolvedValue(mockDetails);

      await userController.getDetailsCampanhasByUsuarioId(req, res);

      expect(userModel.getDetailsCampanhasByUsuarioId).toHaveBeenCalledWith(
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDetails);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };

      userModel.getDetailsCampanhasByUsuarioId.mockRejectedValue(
        new Error("Erro")
      );

      await userController.getDetailsCampanhasByUsuarioId(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar detalhes",
      });
    });
  });
});
