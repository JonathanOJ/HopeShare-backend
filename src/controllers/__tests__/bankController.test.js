const bankController = require("../bankController");
const bankModel = require("../../models/bankModel");

// Mock do bankModel
jest.mock("../../models/bankModel");

describe("bankController", () => {
  let req, res;

  beforeEach(() => {
    // Reset dos mocks antes de cada teste
    jest.clearAllMocks();

    // Mock básico de req e res
    req = {
      params: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock do console.error para não poluir os logs durante os testes
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restaura o console.error após cada teste
    console.error.mockRestore();
  });

  describe("searchBanks", () => {
    it("deve retornar lista de bancos com sucesso", async () => {
      const mockBanks = [
        {
          bank_id: "001",
          name: "Banco do Brasil",
          fullName: "Banco do Brasil S.A.",
        },
        { bank_id: "237", name: "Bradesco", fullName: "Banco Bradesco S.A." },
        { bank_id: "341", name: "Itaú", fullName: "Itaú Unibanco S.A." },
      ];

      req.body = {
        search: "Banco",
        itemsPerPage: 10,
      };

      bankModel.searchBanks.mockResolvedValue(mockBanks);

      await bankController.searchBanks(req, res);

      expect(bankModel.searchBanks).toHaveBeenCalledWith(req.body);
      expect(bankModel.searchBanks).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBanks);
    });

    it("deve retornar lista vazia quando não encontrar bancos", async () => {
      req.body = {
        search: "Banco Inexistente",
        itemsPerPage: 10,
      };

      bankModel.searchBanks.mockResolvedValue([]);

      await bankController.searchBanks(req, res);

      expect(bankModel.searchBanks).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar todos os bancos sem filtro de busca", async () => {
      const mockAllBanks = [
        {
          bank_id: "001",
          name: "Banco do Brasil",
          fullName: "Banco do Brasil S.A.",
        },
        { bank_id: "033", name: "Santander", fullName: "Banco Santander S.A." },
        { bank_id: "104", name: "Caixa", fullName: "Caixa Econômica Federal" },
      ];

      req.body = {
        itemsPerPage: 20,
      };

      bankModel.searchBanks.mockResolvedValue(mockAllBanks);

      await bankController.searchBanks(req, res);

      expect(bankModel.searchBanks).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAllBanks);
    });

    it("deve retornar erro 500 quando searchBanks falhar", async () => {
      const mockError = new Error("Erro ao buscar no DynamoDB");

      req.body = {
        search: "Banco",
        itemsPerPage: 10,
      };

      bankModel.searchBanks.mockRejectedValue(mockError);

      await bankController.searchBanks(req, res);

      expect(bankModel.searchBanks).toHaveBeenCalledWith(req.body);
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Could not perform search",
      });
    });

    it("deve tratar erro de conexão com DynamoDB", async () => {
      const mockError = new Error("Network error");

      req.body = {
        search: "",
        itemsPerPage: 5,
      };

      bankModel.searchBanks.mockRejectedValue(mockError);

      await bankController.searchBanks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Could not perform search",
      });
    });
  });

  describe("getBankById", () => {
    it("deve retornar banco por ID com sucesso", async () => {
      const mockBank = {
        bank_id: "237",
        name: "Bradesco",
        fullName: "Banco Bradesco S.A.",
        ispb: "60746948",
      };

      req.params = { id: "237" };

      bankModel.getBankById.mockResolvedValue(mockBank);

      await bankController.getBankById(req, res);

      expect(bankModel.getBankById).toHaveBeenCalledWith("237");
      expect(bankModel.getBankById).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBank);
    });

    it("deve retornar null quando banco não for encontrado", async () => {
      req.params = { id: "999" };

      bankModel.getBankById.mockResolvedValue(null);

      await bankController.getBankById(req, res);

      expect(bankModel.getBankById).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(null);
    });

    it("deve buscar banco com ID numérico", async () => {
      const mockBank = {
        bank_id: "001",
        name: "Banco do Brasil",
        fullName: "Banco do Brasil S.A.",
      };

      req.params = { id: "001" };

      bankModel.getBankById.mockResolvedValue(mockBank);

      await bankController.getBankById(req, res);

      expect(bankModel.getBankById).toHaveBeenCalledWith("001");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBank);
    });

    it("deve retornar erro 500 quando getBankById falhar", async () => {
      const mockError = new Error("Erro ao buscar banco no DynamoDB");

      req.params = { id: "341" };

      bankModel.getBankById.mockRejectedValue(mockError);

      await bankController.getBankById(req, res);

      expect(bankModel.getBankById).toHaveBeenCalledWith("341");
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Could not retrieve bank",
      });
    });

    it("deve tratar erro de timeout do DynamoDB", async () => {
      const mockError = new Error("RequestTimeout");

      req.params = { id: "104" };

      bankModel.getBankById.mockRejectedValue(mockError);

      await bankController.getBankById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Could not retrieve bank",
      });
    });

    it("deve tratar ID undefined", async () => {
      req.params = { id: undefined };

      bankModel.getBankById.mockResolvedValue(null);

      await bankController.getBankById(req, res);

      expect(bankModel.getBankById).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(null);
    });
  });

  describe("Testes de integração entre funções", () => {
    it("deve permitir buscar e depois obter detalhes de um banco específico", async () => {
      // Primeiro: buscar bancos
      const mockBanks = [
        { bank_id: "237", name: "Bradesco", fullName: "Banco Bradesco S.A." },
      ];

      req.body = { search: "Bradesco", itemsPerPage: 10 };
      bankModel.searchBanks.mockResolvedValue(mockBanks);

      await bankController.searchBanks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBanks);

      // Resetar mocks para o próximo teste
      jest.clearAllMocks();

      // Segundo: obter detalhes do banco encontrado
      const mockBankDetails = {
        bank_id: "237",
        name: "Bradesco",
        fullName: "Banco Bradesco S.A.",
        ispb: "60746948",
      };

      req.params = { id: "237" };
      bankModel.getBankById.mockResolvedValue(mockBankDetails);

      await bankController.getBankById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBankDetails);
    });
  });

  describe("Testes de edge cases", () => {
    it("deve lidar com body vazio em searchBanks", async () => {
      req.body = {};

      bankModel.searchBanks.mockResolvedValue([]);

      await bankController.searchBanks(req, res);

      expect(bankModel.searchBanks).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve lidar com itemsPerPage muito grande", async () => {
      const mockBanks = Array(5)
        .fill()
        .map((_, i) => ({
          bank_id: `00${i}`,
          name: `Banco ${i}`,
          fullName: `Banco Teste ${i}`,
        }));

      req.body = {
        search: "",
        itemsPerPage: 10000,
      };

      bankModel.searchBanks.mockResolvedValue(mockBanks);

      await bankController.searchBanks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBanks);
    });

    it("deve lidar com caracteres especiais na busca", async () => {
      req.body = {
        search: "Bradesco S.A. (123)",
        itemsPerPage: 10,
      };

      bankModel.searchBanks.mockResolvedValue([]);

      await bankController.searchBanks(req, res);

      expect(bankModel.searchBanks).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
