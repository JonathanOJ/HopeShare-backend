const reportController = require("../reportController");
const reportModel = require("../../models/reportModel");
const userModel = require("../../models/userModel");
const campanhaModel = require("../../models/campanhaModel");

// Mock dos modelos
jest.mock("../../models/reportModel");
jest.mock("../../models/userModel");
jest.mock("../../models/campanhaModel");

describe("reportController", () => {
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

  describe("reportCampanha", () => {
    it("deve criar denúncia de campanha com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        email: "joao@example.com",
        image: "https://example.com/image.jpg",
      };

      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
      };

      const mockResult = {
        report_id: "report123",
        campanha: mockCampanha,
        user: {
          user_id: "user123",
          username: "João Silva",
          email: "joao@example.com",
          image: "https://example.com/image.jpg",
        },
        reason: "SPAM",
        description: "Campanha suspeita de spam",
        status: "PENDING",
      };

      req.body = {
        user: mockUser,
        campanha: mockCampanha,
        reason: "SPAM",
        description: "Campanha suspeita de spam",
      };

      reportModel.reportCampanha.mockResolvedValue(mockResult);

      await reportController.reportCampanha(req, res);

      expect(reportModel.reportCampanha).toHaveBeenCalledWith(
        mockCampanha,
        {
          user_id: "user123",
          username: "João Silva",
          email: "joao@example.com",
          image: "https://example.com/image.jpg",
        },
        "SPAM",
        "Campanha suspeita de spam"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve criar denúncia mesmo sem imagem do usuário", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        email: "joao@example.com",
        // sem image
      };

      const mockCampanha = { campanha_id: "camp123" };
      const mockResult = { report_id: "report123" };

      req.body = {
        user: mockUser,
        campanha: mockCampanha,
        reason: "FAKE",
        description: "Descrição",
      };

      reportModel.reportCampanha.mockResolvedValue(mockResult);

      await reportController.reportCampanha(req, res);

      expect(reportModel.reportCampanha).toHaveBeenCalledWith(
        mockCampanha,
        expect.objectContaining({
          image: null,
        }),
        "FAKE",
        "Descrição"
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar erro 400 quando falta user", async () => {
      req.body = {
        campanha: { campanha_id: "camp123" },
        reason: "SPAM",
        description: "Descrição",
        // falta user
      };

      await reportController.reportCampanha(req, res);

      expect(reportModel.reportCampanha).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Faltando usuário, motivo, descrição ou campanha",
      });
    });

    it("deve retornar erro 400 quando falta reason", async () => {
      req.body = {
        user: {
          user_id: "user123",
          username: "João",
          email: "joao@example.com",
        },
        campanha: { campanha_id: "camp123" },
        description: "Descrição",
        // falta reason
      };

      await reportController.reportCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar erro 400 quando falta description", async () => {
      req.body = {
        user: {
          user_id: "user123",
          username: "João",
          email: "joao@example.com",
        },
        campanha: { campanha_id: "camp123" },
        reason: "SPAM",
        // falta description
      };

      await reportController.reportCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar erro 400 quando falta campanha", async () => {
      req.body = {
        user: {
          user_id: "user123",
          username: "João",
          email: "joao@example.com",
        },
        reason: "SPAM",
        description: "Descrição",
        // falta campanha
      };

      await reportController.reportCampanha(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar erro 500 ao falhar na criação", async () => {
      req.body = {
        user: {
          user_id: "user123",
          username: "João",
          email: "joao@example.com",
        },
        campanha: { campanha_id: "camp123" },
        reason: "SPAM",
        description: "Descrição",
      };

      reportModel.reportCampanha.mockRejectedValue(new Error("Erro no banco"));

      await reportController.reportCampanha(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível denunciar a campanha",
      });
    });
  });

  describe("getDenuncias", () => {
    it("deve retornar denúncias ordenadas por data para admin", async () => {
      const mockAdmin = {
        user_id: "admin123",
        username: "Admin",
        admin: true,
      };

      const mockDenuncias = {
        Items: [
          {
            report_id: "rep1",
            created_at: "2025-11-01T10:00:00Z",
            status: "PENDING",
          },
          {
            report_id: "rep2",
            created_at: "2025-11-02T10:00:00Z",
            status: "PENDING",
          },
          {
            report_id: "rep3",
            created_at: "2025-10-31T10:00:00Z",
            status: "ANALYZED",
          },
        ],
      };

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.getDenuncias.mockResolvedValue(mockDenuncias);

      await reportController.getDenuncias(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(reportModel.getDenuncias).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      // Verifica ordenação (mais recente primeiro)
      const returnedData = res.json.mock.calls[0][0];
      expect(returnedData[0].report_id).toBe("rep2"); // 2025-11-02
      expect(returnedData[1].report_id).toBe("rep1"); // 2025-11-01
      expect(returnedData[2].report_id).toBe("rep3"); // 2025-10-31
    });

    it("deve retornar erro 401 quando usuário não é admin", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João",
        admin: false,
      };

      req.params = { user_id: "user123" };

      userModel.findById.mockResolvedValue(mockUser);

      await reportController.getDenuncias(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(reportModel.getDenuncias).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado",
      });
    });

    it("deve retornar erro 401 quando usuário não existe", async () => {
      req.params = { user_id: "user999" };

      userModel.findById.mockResolvedValue(null);

      await reportController.getDenuncias(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado",
      });
    });

    it("deve retornar erro 500 ao falhar na busca", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.getDenuncias.mockRejectedValue(new Error("Erro no banco"));

      await reportController.getDenuncias(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar as denúncias",
      });
    });
  });

  describe("getDenunciasGrouped", () => {
    it("deve retornar denúncias agrupadas por campanha", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      const mockDenuncias = {
        Items: [
          {
            report_id: "rep1",
            campanha: { campanha_id: "camp1" },
            status: "PENDING",
            created_at: "2025-11-01T10:00:00Z",
          },
          {
            report_id: "rep2",
            campanha: { campanha_id: "camp1" },
            status: "ANALYZED",
            created_at: "2025-11-02T10:00:00Z",
          },
          {
            report_id: "rep3",
            campanha: { campanha_id: "camp2" },
            status: "RESOLVED",
            created_at: "2025-11-01T10:00:00Z",
          },
        ],
      };

      const mockCampanhas = [
        { campanha_id: "camp1", title: "Campanha 1", status: "ACTIVE" },
        { campanha_id: "camp2", title: "Campanha 2", status: "SUSPENDED" },
      ];

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.getDenuncias.mockResolvedValue(mockDenuncias);
      campanhaModel.findAllByIds.mockResolvedValue(mockCampanhas);

      await reportController.getDenunciasGrouped(req, res);

      expect(campanhaModel.findAllByIds).toHaveBeenCalledWith([
        "camp1",
        "camp2",
      ]);
      expect(res.status).toHaveBeenCalledWith(200);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);

      // Verifica campanha 1
      const camp1 = result.find((c) => c.campanha_id === "camp1");
      expect(camp1.campanha_title).toBe("Campanha 1");
      expect(camp1.total_denuncias).toBe(2);
      expect(camp1.denuncias_pendentes).toBe(1);
      expect(camp1.denuncias_analisadas).toBe(1);
      expect(camp1.is_suspended).toBe(false);

      // Verifica campanha 2
      const camp2 = result.find((c) => c.campanha_id === "camp2");
      expect(camp2.campanha_title).toBe("Campanha 2");
      expect(camp2.total_denuncias).toBe(1);
      expect(camp2.denuncias_resolvidas).toBe(1);
      expect(camp2.is_suspended).toBe(true);
    });

    it("deve ignorar denúncias sem campanha_id", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      const mockDenuncias = {
        Items: [
          {
            report_id: "rep1",
            campanha: null,
            status: "PENDING",
            created_at: "2025-11-01T10:00:00Z",
          },
          {
            report_id: "rep2",
            campanha: { campanha_id: "camp1" },
            status: "PENDING",
            created_at: "2025-11-02T10:00:00Z",
          },
        ],
      };

      const mockCampanhas = [
        { campanha_id: "camp1", title: "Campanha 1", status: "ACTIVE" },
      ];

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.getDenuncias.mockResolvedValue(mockDenuncias);
      campanhaModel.findAllByIds.mockResolvedValue(mockCampanhas);

      await reportController.getDenunciasGrouped(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0].campanha_id).toBe("camp1");
    });

    it("deve retornar erro 401 quando usuário não é admin", async () => {
      const mockUser = { user_id: "user123", admin: false };

      req.params = { user_id: "user123" };

      userModel.findById.mockResolvedValue(mockUser);

      await reportController.getDenunciasGrouped(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado",
      });
    });

    it("deve retornar erro 500 ao falhar", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.getDenuncias.mockRejectedValue(new Error("Erro"));

      await reportController.getDenunciasGrouped(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível buscar as denúncias agrupadas",
      });
    });

    it("deve contar corretamente diferentes status de denúncia", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      const mockDenuncias = {
        Items: [
          {
            report_id: "rep1",
            campanha: { campanha_id: "camp1" },
            status: "PENDING",
            created_at: "2025-11-01T10:00:00Z",
          },
          {
            report_id: "rep2",
            campanha: { campanha_id: "camp1" },
            status: "PENDING",
            created_at: "2025-11-02T10:00:00Z",
          },
          {
            report_id: "rep3",
            campanha: { campanha_id: "camp1" },
            status: "ANALYZED",
            created_at: "2025-11-03T10:00:00Z",
          },
          {
            report_id: "rep4",
            campanha: { campanha_id: "camp1" },
            status: "RESOLVED",
            created_at: "2025-11-04T10:00:00Z",
          },
        ],
      };

      const mockCampanhas = [
        { campanha_id: "camp1", title: "Campanha 1", status: "ACTIVE" },
      ];

      req.params = { user_id: "admin123" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.getDenuncias.mockResolvedValue(mockDenuncias);
      campanhaModel.findAllByIds.mockResolvedValue(mockCampanhas);

      await reportController.getDenunciasGrouped(req, res);

      const result = res.json.mock.calls[0][0];
      const camp = result[0];

      expect(camp.total_denuncias).toBe(4);
      expect(camp.denuncias_pendentes).toBe(2);
      expect(camp.denuncias_analisadas).toBe(1);
      expect(camp.denuncias_resolvidas).toBe(1);
    });
  });

  describe("updateDenunciaStatus", () => {
    it("deve atualizar status da denúncia com sucesso", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      const mockResult = {
        Attributes: {
          report_id: "rep123",
          status: "ANALYZED",
          updated_at: "2025-11-02T10:00:00Z",
        },
      };

      req.params = { user_id: "admin123", report_id: "rep123" };
      req.body = { status: "ANALYZED" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.updateDenunciaStatus.mockResolvedValue(mockResult);

      await reportController.updateDenunciaStatus(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      expect(reportModel.updateDenunciaStatus).toHaveBeenCalledWith(
        "rep123",
        "ANALYZED"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult.Attributes);
    });

    it("deve retornar erro 401 quando usuário não é admin", async () => {
      const mockUser = { user_id: "user123", admin: false };

      req.params = { user_id: "user123", report_id: "rep123" };
      req.body = { status: "ANALYZED" };

      userModel.findById.mockResolvedValue(mockUser);

      await reportController.updateDenunciaStatus(req, res);

      expect(reportModel.updateDenunciaStatus).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Acesso negado",
      });
    });

    it("deve retornar erro 401 quando usuário não existe", async () => {
      req.params = { user_id: "user999", report_id: "rep123" };
      req.body = { status: "ANALYZED" };

      userModel.findById.mockResolvedValue(null);

      await reportController.updateDenunciaStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("deve retornar erro 400 quando falta status", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { user_id: "admin123", report_id: "rep123" };
      req.body = {}; // sem status

      userModel.findById.mockResolvedValue(mockAdmin);

      await reportController.updateDenunciaStatus(req, res);

      expect(reportModel.updateDenunciaStatus).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Faltando status",
      });
    });

    it("deve retornar erro 500 ao falhar na atualização", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      req.params = { user_id: "admin123", report_id: "rep123" };
      req.body = { status: "ANALYZED" };

      userModel.findById.mockResolvedValue(mockAdmin);
      reportModel.updateDenunciaStatus.mockRejectedValue(
        new Error("Erro no banco")
      );

      await reportController.updateDenunciaStatus(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Não foi possível atualizar o status da denúncia",
      });
    });

    it("deve aceitar diferentes status válidos", async () => {
      const mockAdmin = { user_id: "admin123", admin: true };

      userModel.findById.mockResolvedValue(mockAdmin);

      const statuses = ["PENDING", "ANALYZED", "RESOLVED"];

      for (const status of statuses) {
        jest.clearAllMocks();

        req.params = { user_id: "admin123", report_id: "rep123" };
        req.body = { status };

        reportModel.updateDenunciaStatus.mockResolvedValue({
          Attributes: { report_id: "rep123", status },
        });

        await reportController.updateDenunciaStatus(req, res);

        expect(reportModel.updateDenunciaStatus).toHaveBeenCalledWith(
          "rep123",
          status
        );
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });
  });
});
