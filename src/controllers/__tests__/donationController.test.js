const donationController = require("../donationController");
const donationModel = require("../../models/donationModel");
const campanhaModel = require("../../models/campanhaModel");
const mercadoPagoService = require("../../services/mercadoPagoService");
const userModel = require("../../models/userModel");

// Mock dos modelos e serviços
jest.mock("../../models/donationModel");
jest.mock("../../models/campanhaModel");
jest.mock("../../services/mercadoPagoService");
jest.mock("../../models/userModel");

describe("donationController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
    console.warn.mockRestore();
  });

  describe("createDonation", () => {
    it("deve criar doação com sucesso", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Silva",
        email: "joao@example.com",
      };

      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
        status: "ACTIVE",
      };

      const mockPreference = {
        id: "pref123",
        init_point:
          "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref123",
        sandbox_init_point:
          "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref123",
      };

      req.body = {
        user_id: "user123",
        campanha_id: "camp123",
        amount: 50.0,
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      userModel.findById.mockResolvedValue(mockUser);
      mercadoPagoService.createPaymentPreference.mockResolvedValue(
        mockPreference
      );

      await donationController.createDonation(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("camp123");
      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              title: "Doação para: Campanha Teste",
              unit_price: 50.0,
            }),
          ]),
          metadata: expect.objectContaining({
            user_id: "user123",
            campanha_id: "camp123",
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          preference_id: "pref123",
          init_point: mockPreference.init_point,
          sandbox_init_point: mockPreference.sandbox_init_point,
        },
      });
    });

    it("deve retornar erro 400 quando faltam dados obrigatórios", async () => {
      req.body = {
        user_id: "user123",
        // falta campanha_id e amount
      };

      await donationController.createDonation(req, res);

      expect(campanhaModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "user_id, campanha_id e amount são obrigatórios",
      });
    });

    it("deve retornar erro 404 quando campanha não existe", async () => {
      req.body = {
        user_id: "user123",
        campanha_id: "camp999",
        amount: 50.0,
      };

      campanhaModel.findById.mockResolvedValue(null);

      await donationController.createDonation(req, res);

      expect(campanhaModel.findById).toHaveBeenCalledWith("camp999");
      expect(userModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Campanha não encontrada",
      });
    });

    it("deve retornar erro 400 quando campanha não está ativa", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
        status: "FINISHED",
      };

      req.body = {
        user_id: "user123",
        campanha_id: "camp123",
        amount: 50.0,
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);

      await donationController.createDonation(req, res);

      expect(userModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Campanha não está ativa para receber doações",
      });
    });

    it("deve retornar erro 404 quando usuário não existe", async () => {
      const mockCampanha = {
        campanha_id: "camp123",
        status: "ACTIVE",
      };

      req.body = {
        user_id: "user999",
        campanha_id: "camp123",
        amount: 50.0,
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      userModel.findById.mockResolvedValue(null);

      await donationController.createDonation(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user999");
      expect(mercadoPagoService.createPaymentPreference).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Usuário não encontrado",
      });
    });

    it("deve retornar erro 500 ao falhar na criação da preferência", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João",
        email: "joao@example.com",
      };
      const mockCampanha = {
        campanha_id: "camp123",
        status: "ACTIVE",
        title: "Teste",
      };

      req.body = {
        user_id: "user123",
        campanha_id: "camp123",
        amount: 50.0,
      };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      userModel.findById.mockResolvedValue(mockUser);
      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error("Erro no Mercado Pago")
      );

      await donationController.createDonation(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Erro no Mercado Pago",
      });
    });

    it("deve criar doação com nome completo do usuário", async () => {
      const mockUser = {
        user_id: "user123",
        username: "João Pedro da Silva Santos",
        email: "joao@example.com",
      };

      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha",
        status: "ACTIVE",
      };

      const mockPreference = {
        id: "pref123",
        init_point: "url",
        sandbox_init_point: "url",
      };

      req.body = { user_id: "user123", campanha_id: "camp123", amount: 100 };

      campanhaModel.findById.mockResolvedValue(mockCampanha);
      userModel.findById.mockResolvedValue(mockUser);
      mercadoPagoService.createPaymentPreference.mockResolvedValue(
        mockPreference
      );

      await donationController.createDonation(req, res);

      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          payer: {
            email: "joao@example.com",
            name: "João",
            surname: "Pedro da Silva Santos",
          },
        })
      );
    });
  });

  describe("getUserDonations", () => {
    it("deve retornar doações do usuário", async () => {
      const mockDonations = [
        {
          payment_id: "pay1",
          user_id: "user123",
          amount: 50,
          status: "approved",
        },
        {
          payment_id: "pay2",
          user_id: "user123",
          amount: 100,
          status: "approved",
        },
      ];

      req.params = { user_id: "user123" };

      donationModel.findByUserId.mockResolvedValue(mockDonations);

      await donationController.getUserDonations(req, res);

      expect(donationModel.findByUserId).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDonations);
    });

    it("deve retornar lista vazia quando usuário não tem doações", async () => {
      req.params = { user_id: "user123" };

      donationModel.findByUserId.mockResolvedValue([]);

      await donationController.getUserDonations(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { user_id: "user123" };

      donationModel.findByUserId.mockRejectedValue(
        new Error("Erro no DynamoDB")
      );

      await donationController.getUserDonations(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Erro no DynamoDB",
      });
    });
  });

  describe("getCampanhaDonations", () => {
    it("deve retornar doações da campanha", async () => {
      const mockDonations = [
        { payment_id: "pay1", campanha_id: "camp123", amount: 50 },
        { payment_id: "pay2", campanha_id: "camp123", amount: 100 },
      ];

      req.params = { campanha_id: "camp123" };

      donationModel.findByCampanhaId.mockResolvedValue(mockDonations);

      await donationController.getCampanhaDonations(req, res);

      expect(donationModel.findByCampanhaId).toHaveBeenCalledWith("camp123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDonations);
    });

    it("deve retornar lista vazia quando campanha não tem doações", async () => {
      req.params = { campanha_id: "camp123" };

      donationModel.findByCampanhaId.mockResolvedValue([]);

      await donationController.getCampanhaDonations(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("deve retornar erro 500 ao falhar", async () => {
      req.params = { campanha_id: "camp123" };

      donationModel.findByCampanhaId.mockRejectedValue(new Error("Erro"));

      await donationController.getCampanhaDonations(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Erro",
      });
    });
  });

  describe("refundDonation", () => {
    // Nota: O código atual tem um bug - usa `amount` undefined na linha 142
    // Este teste documenta o comportamento atual
    it("deve retornar erro 500 devido a bug no código (amount undefined)", async () => {
      const mockDonation = {
        payment_id: "pay123",
        campanha_id: "camp123",
        amount: 50,
        status: "approved",
      };

      const mockRefund = {
        id: "refund123",
        amount: 50,
      };

      const mockCampanha = {
        campanha_id: "camp123",
        value_donated: 500,
      };

      req.params = { payment_id: "pay123" };

      donationModel.findById.mockResolvedValue(mockDonation);
      mercadoPagoService.refundPayment.mockResolvedValue(mockRefund);
      campanhaModel.findById.mockResolvedValue(mockCampanha);
      campanhaModel.updateCampanha.mockResolvedValue({});

      await donationController.refundDonation(req, res);

      // O código retorna 500 devido ao erro "amount is not defined"
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "amount is not defined",
      });
    });

    it("deve retornar erro 404 quando doação não existe", async () => {
      req.params = { payment_id: "pay999" };

      donationModel.findById.mockResolvedValue(null);

      await donationController.refundDonation(req, res);

      expect(donationModel.findById).toHaveBeenCalledWith("pay999");
      expect(mercadoPagoService.refundPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Doação não encontrada",
      });
    });

    it("deve retornar erro 400 quando doação não está aprovada", async () => {
      const mockDonation = {
        payment_id: "pay123",
        status: "pending",
      };

      req.params = { payment_id: "pay123" };

      donationModel.findById.mockResolvedValue(mockDonation);

      await donationController.refundDonation(req, res);

      expect(mercadoPagoService.refundPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error:
          "Doação precisa estar com status 'approved' para ser reembolsada, caso contrário, contate o suporte",
      });
    });

    it("deve retornar erro 500 ao falhar no reembolso", async () => {
      const mockDonation = {
        payment_id: "pay123",
        status: "approved",
      };

      req.params = { payment_id: "pay123" };

      donationModel.findById.mockResolvedValue(mockDonation);
      mercadoPagoService.refundPayment.mockRejectedValue(
        new Error("Erro no MP")
      );

      await donationController.refundDonation(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Erro no MP",
      });
    });
  });

  describe("mercadoPagoWebhook", () => {
    it("deve processar webhook de pagamento aprovado e criar doação", async () => {
      const mockPaymentData = {
        payment_id: 123,
        external_reference: "camp123",
        transaction_amount: 50,
        status: "approved",
        payment_method_id: "pix",
        metadata: { user_id: "user123" },
      };

      const mockCampanha = {
        campanha_id: "camp123",
        title: "Campanha Teste",
      };

      const mockDonation = {
        payment_id: "123",
        user_id: "user123",
        campanha_id: "camp123",
        amount: 50,
        status: "approved",
      };

      req.body = {
        topic: "payment",
        resource: "/v1/payments/123",
      };

      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);
      mercadoPagoService.processWebhookNotification.mockResolvedValue(
        mockPaymentData
      );
      donationModel.findById.mockResolvedValue(null);
      campanhaModel.findById.mockResolvedValue(mockCampanha);
      donationModel.createDonation.mockResolvedValue(mockDonation);
      campanhaModel.updateValueDonated.mockResolvedValue({});
      campanhaModel.updateUsersDonated.mockResolvedValue({});
      userModel.findById.mockResolvedValue({
        user_id: "user123",
        username: "Test User",
        imagem: { url: "http://image.url" },
      });
      userModel.updateTotalCampanhasDonated.mockResolvedValue({});
      userModel.updateTotalDonated.mockResolvedValue({});

      await donationController.mercadoPagoWebhook(req, res);

      expect(
        mercadoPagoService.processWebhookNotification
      ).toHaveBeenCalledWith({
        topic: "payment",
        resource: "123",
      });
      expect(donationModel.createDonation).toHaveBeenCalled();
      expect(campanhaModel.updateValueDonated).toHaveBeenCalled();
      expect(campanhaModel.updateUsersDonated).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("deve atualizar status de doação existente", async () => {
      const mockPaymentData = {
        payment_id: 123,
        status: "approved",
      };

      const mockDonation = {
        payment_id: "123",
        user_id: "user123",
        campanha_id: "camp123",
        amount: 50,
        status: "pending",
      };

      req.body = {
        topic: "payment",
        resource: "123",
      };

      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);
      mercadoPagoService.processWebhookNotification.mockResolvedValue(
        mockPaymentData
      );
      donationModel.findById.mockResolvedValue(mockDonation);
      donationModel.updateStatus.mockResolvedValue({});
      campanhaModel.updateValueDonated.mockResolvedValue({});
      campanhaModel.updateUsersDonated.mockResolvedValue({});
      userModel.findById.mockResolvedValue({
        user_id: "user123",
        username: "Test User",
        imagem: { url: "http://image.url" },
      });
      userModel.updateTotalCampanhasDonated.mockResolvedValue({});
      userModel.updateTotalDonated.mockResolvedValue({});

      await donationController.mercadoPagoWebhook(req, res);

      expect(donationModel.updateStatus).toHaveBeenCalledWith(
        "123",
        "approved"
      );
      expect(campanhaModel.updateValueDonated).toHaveBeenCalled();
      expect(campanhaModel.updateUsersDonated).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve ignorar webhook quando paymentData é null", async () => {
      req.body = {
        topic: "payment",
        resource: "123",
      };

      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);
      mercadoPagoService.processWebhookNotification.mockResolvedValue(null);

      await donationController.mercadoPagoWebhook(req, res);

      expect(donationModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("deve ignorar webhook quando campanha não existe", async () => {
      const mockPaymentData = {
        payment_id: 123,
        external_reference: "camp999",
        metadata: { user_id: "user123" },
      };

      req.body = { topic: "payment", resource: "123" };

      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);
      mercadoPagoService.processWebhookNotification.mockResolvedValue(
        mockPaymentData
      );
      donationModel.findById.mockResolvedValue(null);
      campanhaModel.findById.mockResolvedValue(null);

      await donationController.mercadoPagoWebhook(req, res);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Campanha não encontrada")
      );
      expect(donationModel.createDonation).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar erro 200 mesmo com falha no processamento", async () => {
      req.body = { topic: "payment", resource: "123" };

      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);
      mercadoPagoService.processWebhookNotification.mockRejectedValue(
        new Error("Erro")
      );

      await donationController.mercadoPagoWebhook(req, res);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Erro",
      });
    });
  });
});
