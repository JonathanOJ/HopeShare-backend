const campanhaController = require("../campanhaController");
const campanhaModel = require("../../models/campanhaModel");
const userModel = require("../../models/userModel");

// Mock dos modelos
jest.mock("../../models/campanhaModel");
jest.mock("../../models/userModel");

describe("campanhaController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      query: {},
      body: {},
      files: [],
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

  describe("findById", () => {
    it("deve retornar campanha por ID com sucesso", async () => {
      const mockCampanha = {
        campanha_id: "123",
        title: "Campanha Teste",
        description: "Descrição da campanha",
        status: "ACTIVE",
        value_required: 5000,
        value_donated: 1000,
      };

      req.params = { campanha_id: "123" };
      campanhaModel.findById.mockResolvedValue(mockCampanha);

      await campanhaController.findById(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCampanha);
    });

    it("deve retornar 404 quando campanha não for encontrada", async () => {
      req.params = { campanha_id: "999" };
      campanhaModel.findById.mockResolvedValue(null);

      await campanhaController.findById(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Campanha não encontrada",
      });
    });

    it("deve retornar erro 500 ao falhar na busca", async () => {
      req.params = { campanha_id: "123" };
      campanhaModel.findById.mockRejectedValue(new Error("Erro no banco"));

      await campanhaController.findById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar campanha",
      });
    });
  });

  describe("findAllByUser", () => {
    it("deve retornar todas as campanhas de um usuário", async () => {
      const mockCampanhas = [
        { campanha_id: "1", title: "Campanha 1", status: "ACTIVE" },
        { campanha_id: "2", title: "Campanha 2", status: "FINISHED" },
      ];

      req.params = { user_id: "user123" };
      req.query = { with_comments: "false" };
      campanhaModel.findAllByUser.mockResolvedValue(mockCampanhas);

      await campanhaController.findAllByUser(req, res);

      expect(campanhaModel.findAllByUser).toHaveBeenCalledWith(
        "user123",
        false
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCampanhas);
    });

    it("deve buscar campanhas com comentários quando solicitado", async () => {
      const mockCampanhas = [
        {
          campanha_id: "1",
          title: "Campanha 1",
          comments: [{ comment_id: "c1", text: "Comentário" }],
        },
      ];

      req.params = { user_id: "user123" };
      req.query = { with_comments: "true" };
      campanhaModel.findAllByUser.mockResolvedValue(mockCampanhas);

      await campanhaController.findAllByUser(req, res);

      expect(campanhaModel.findAllByUser).toHaveBeenCalledWith("user123", true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCampanhas);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };
      req.query = {};
      campanhaModel.findAllByUser.mockRejectedValue(new Error("Erro"));

      await campanhaController.findAllByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar campanhas do usuário",
      });
    });
  });

  describe("searchCampanhas", () => {
    it("deve buscar campanhas com filtros", async () => {
      const mockSearchResult = [
        { campanha_id: "1", title: "Campanha A" },
        { campanha_id: "2", title: "Campanha B" },
      ];

      req.body = {
        search: "Campanha",
        category: "SAUDE",
        itemsPerPage: 10,
      };

      campanhaModel.searchCampanhas.mockResolvedValue(mockSearchResult);

      await campanhaController.searchCampanhas(req, res);

      expect(campanhaModel.searchCampanhas).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSearchResult);
    });

    it("deve retornar lista vazia quando não encontrar campanhas", async () => {
      req.body = { search: "Inexistente" };
      campanhaModel.searchCampanhas.mockResolvedValue([]);

      await campanhaController.searchCampanhas(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.body = { search: "test" };
      campanhaModel.searchCampanhas.mockRejectedValue(new Error("Erro"));

      await campanhaController.searchCampanhas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível realizar a busca",
      });
    });
  });

  describe("deleteCampanha", () => {
    it("deve deletar campanha sem doações", async () => {
      const mockCampanha = {
        campanha_id: "123",
        value_donated: 0,
      };

      req.params = { campanha_id: "123" };
      campanhaModel.findById.mockResolvedValue(mockCampanha);
      campanhaModel.deleteCampanha.mockResolvedValue({
        Attributes: { campanha_id: "123" },
      });

      await campanhaController.deleteCampanha(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("123");
      expect(campanhaModel.deleteCampanha).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("deve impedir deleção de campanha com doações", async () => {
      const mockCampanha = {
        campanha_id: "123",
        value_donated: 500,
      };

      req.params = { campanha_id: "123" };
      campanhaModel.findById.mockResolvedValue(mockCampanha);

      await campanhaController.deleteCampanha(req, res);

      expect(campanhaModel.deleteCampanha).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não é possível deletar a campanha, pois possui doações!",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockCampanha = { campanha_id: "123", value_donated: 0 };

      req.params = { campanha_id: "123" };
      campanhaModel.findById.mockResolvedValue(mockCampanha);
      campanhaModel.deleteCampanha.mockRejectedValue(new Error("Erro"));

      await campanhaController.deleteCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível deletar a campanha",
      });
    });
  });

  describe("addComment", () => {
    it("deve adicionar comentário com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
      };

      const mockResult = {
        Attributes: {
          campanha_id: "123",
          comments: [{ comment_id: "c1", text: "Ótima campanha!" }],
        },
      };

      req.params = { campanha_id: "123" };
      req.body = {
        user_id: "user123",
        comment: "Ótima campanha!",
      };

      userModel.findById.mockResolvedValue(mockUser);
      campanhaModel.addComment.mockResolvedValue(mockResult);

      await campanhaController.addComment(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(campanhaModel.addComment).toHaveBeenCalledWith(
        "123",
        mockUser,
        "Ótima campanha!"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult.Attributes);
    });

    it("deve retornar erro 400 quando faltam dados", async () => {
      req.params = { campanha_id: "123" };
      req.body = { user_id: "user123" }; // falta comment

      await campanhaController.addComment(req, res);

      expect(userModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Faltando usuário ou comentário",
      });
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      req.params = { campanha_id: "123" };
      req.body = {
        user_id: "user999",
        comment: "Comentário",
      };

      userModel.findById.mockResolvedValue(null);

      await campanhaController.addComment(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user999");
      expect(campanhaModel.addComment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Usuário não encontrado",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockUser = { user_id: "user123" };

      req.params = { campanha_id: "123" };
      req.body = { user_id: "user123", comment: "Teste" };

      userModel.findById.mockResolvedValue(mockUser);
      campanhaModel.addComment.mockRejectedValue(new Error("Erro"));

      await campanhaController.addComment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível adicionar o comentário",
      });
    });
  });

  describe("getComments", () => {
    it("deve retornar comentários da campanha", async () => {
      const mockComments = [
        { comment_id: "c1", text: "Comentário 1", user: { username: "User1" } },
        { comment_id: "c2", text: "Comentário 2", user: { username: "User2" } },
      ];

      req.params = { campanha_id: "123" };
      campanhaModel.getComments.mockResolvedValue(mockComments);

      await campanhaController.getComments(req, res);

      expect(campanhaModel.getComments).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockComments);
    });

    it("deve retornar lista vazia quando não há comentários", async () => {
      req.params = { campanha_id: "123" };
      campanhaModel.getComments.mockResolvedValue([]);

      await campanhaController.getComments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { campanha_id: "123" };
      campanhaModel.getComments.mockRejectedValue(new Error("Erro"));

      await campanhaController.getComments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível recuperar os comentários",
      });
    });
  });

  describe("deleteComment", () => {
    it("deve deletar comentário com sucesso", async () => {
      req.params = {
        campanha_id: "123",
        comment_id: "c1",
      };

      campanhaModel.deleteComment.mockResolvedValue(true);

      await campanhaController.deleteComment(req, res);

      expect(campanhaModel.deleteComment).toHaveBeenCalledWith("123", "c1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("deve retornar false quando comentário não existe", async () => {
      req.params = {
        campanha_id: "123",
        comment_id: "c999",
      };

      campanhaModel.deleteComment.mockResolvedValue(false);

      await campanhaController.deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { campanha_id: "123", comment_id: "c1" };
      campanhaModel.deleteComment.mockRejectedValue(new Error("Erro"));

      await campanhaController.deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível deletar o comentário",
      });
    });
  });

  describe("updateStatusCampanha", () => {
    it("deve atualizar status quando usuário é admin", async () => {
      const mockAdmin = {
        user_id: "admin123",
        admin: true,
      };

      const mockResult = {
        campanha_id: "123",
        status: "APPROVED",
      };

      req.params = {
        campanha_id: "123",
        user_id: "admin123",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      campanhaModel.updateStatusCampanha.mockResolvedValue(mockResult);

      await campanhaController.updateStatusCampanha(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(campanhaModel.updateStatusCampanha).toHaveBeenCalledWith(
        "123",
        "APPROVED"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve negar acesso quando usuário não é admin", async () => {
      const mockUser = {
        user_id: "user123",
        admin: false,
      };

      req.params = {
        campanha_id: "123",
        user_id: "user123",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(mockUser);

      await campanhaController.updateStatusCampanha(req, res);

      expect(campanhaModel.updateStatusCampanha).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Acesso negado" });
    });

    it("deve negar acesso quando usuário não existe", async () => {
      req.params = {
        campanha_id: "123",
        user_id: "user999",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(null);

      await campanhaController.updateStatusCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Acesso negado" });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = {
        campanha_id: "123",
        user_id: "admin123",
        status: "APPROVED",
      };

      userModel.findById.mockResolvedValue(mockAdmin);
      campanhaModel.updateStatusCampanha.mockRejectedValue(new Error("Erro"));

      await campanhaController.updateStatusCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível alterar o status da campanha",
      });
    });
  });

  describe("suspendCampanha", () => {
    it("deve suspender campanha quando admin e motivo fornecido", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };
      const mockResult = { campanha_id: "123", status: "SUSPENDED" };

      req.params = { campanha_id: "123", user_id: "admin123" };
      req.body = { reason: "Conteúdo inadequado" };

      userModel.findById.mockResolvedValue(mockAdmin);
      campanhaModel.suspendCampanha.mockResolvedValue(mockResult);

      await campanhaController.suspendCampanha(req, res);

      expect(campanhaModel.suspendCampanha).toHaveBeenCalledWith(
        "123",
        "Conteúdo inadequado"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando motivo não é fornecido", async () => {
      req.params = { campanha_id: "123", user_id: "admin123" };
      req.body = {};

      await campanhaController.suspendCampanha(req, res);

      expect(userModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Motivo da suspensão é obrigatório",
      });
    });

    it("deve negar acesso quando usuário não é admin", async () => {
      const mockUser = { user_id: "user123", admin: false };

      req.params = { campanha_id: "123", user_id: "user123" };
      req.body = { reason: "Motivo" };

      userModel.findById.mockResolvedValue(mockUser);

      await campanhaController.suspendCampanha(req, res);

      expect(campanhaModel.suspendCampanha).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Acesso negado" });
    });
  });

  describe("reactivateCampanha", () => {
    it("deve reativar campanha quando usuário é admin", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };
      const mockResult = { campanha_id: "123", status: "ACTIVE" };

      req.params = { campanha_id: "123", user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      campanhaModel.reactivateCampanha.mockResolvedValue(mockResult);

      await campanhaController.reactivateCampanha(req, res);

      expect(campanhaModel.reactivateCampanha).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve negar acesso quando usuário não é admin", async () => {
      const mockUser = { user_id: "user123", admin: false };

      req.params = { campanha_id: "123", user_id: "user123" };

      userModel.findById.mockResolvedValue(mockUser);

      await campanhaController.reactivateCampanha(req, res);

      expect(campanhaModel.reactivateCampanha).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Acesso negado" });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { campanha_id: "123", user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      campanhaModel.reactivateCampanha.mockRejectedValue(new Error("Erro"));

      await campanhaController.reactivateCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível reativar a campanha",
      });
    });
  });
});
