const donationModel = require("../models/donationModel");
const campanhaModel = require("../models/campanhaModel");
const mercadoPagoService = require("../services/mercadoPagoService");

const createDonation = async (req, res) => {
  try {
    const { user_id, campanha_id, amount } = req.body;

    if (!user_id || !campanha_id || !amount) {
      return res.status(400).json({
        success: false,
        error: "user_id, campanha_id e amount são obrigatórios",
      });
    }

    const campanha = await campanhaModel.findById(campanha_id);
    if (!campanha) {
      return res.status(404).json({
        success: false,
        error: "Campanha não encontrada",
      });
    }

    if (campanha.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        error: "Campanha não está ativa para receber doações",
      });
    }

    const user = await campanhaModel.getUserById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    // Dados do pagador (opcional)
    const firstName = user.name.split(" ")[0];
    const lastName = user.name.split(" ").slice(1).join(" ");

    const payer = {
      email: user.email,
      first_name: firstName || "",
      last_name: lastName || "",
    };

    // Cria preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: `Doação para: ${campanha.title}`,
          quantity: 1,
          unit_price: parseFloat(value),
          currency_id: "BRL",
        },
      ],
      payer: payer || {},
      back_urls: {
        success: `${process.env.FRONTEND_URL}/donation/success`,
        failure: `${process.env.FRONTEND_URL}/donation/failure`,
        pending: `${process.env.FRONTEND_URL}/donation/pending`,
      },
      notification_url: `${process.env.API_URL}/webhooks/mercadopago`,
      external_reference: campanha_id, // Para identificar a campanha no webhook
      metadata: {
        user_id,
        campanha_id,
        campanha_title: campanha.title,
      },
    };

    const preference = await mercadoPagoService.createPaymentPreference(
      preferenceData
    );

    await donationModel.createDonation({
      user_id,
      campanha_id,
      payment_id: preference.id, // ID da preferência
      payment_method: "",
      title_campanha: campanha.title,
      amount: parseFloat(amount),
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      refund_requested_at: null,
    });

    res.status(201).json({
      data: {
        init_point: preference.init_point, // URL PRODUÇÃO
        sandbox_init_point: preference.sandbox_init_point, // URL TESTE
      },
    });
  } catch (error) {
    console.error("Erro ao criar doação:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getUserDonations = async (req, res) => {
  try {
    const { user_id } = req.params;
    const donations = await donationModel.findByUserId(user_id);

    res.status(200).json(donations);
  } catch (error) {
    console.error("Erro ao buscar doações do usuário:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getCampanhaDonations = async (req, res) => {
  try {
    const { campanha_id } = req.params;
    const donations = await donationModel.findByCampanhaId(campanha_id);

    res.status(200).json(donations);
  } catch (error) {
    console.error("Erro ao buscar doações da campanha:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const refundDonation = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const donation = await donationModel.findById(payment_id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: "Doação não encontrada",
      });
    }

    if (donation.status !== "approved") {
      return res.status(400).json({
        success: false,
        error:
          "Doação precisa estar com status 'approved' para ser reembolsada, caso contrário, contate o suporte",
      });
    }

    const refund = await mercadoPagoService.refundPayment(donation.payment_id);

    // 6. Atualiza valor doado na campanha
    await updateCampanhaRefund(donation.campanha_id, amount || donation.amount);

    res.status(200).json({
      success: true,
      message: "Reembolso realizado com sucesso",
      data: {
        refund_id: refund.id,
        amount: amount || donation.amount,
      },
    });
  } catch (error) {
    console.error("Erro ao reembolsar doação:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Webhook do Mercado Pago
const mercadoPagoWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log("📬 Webhook recebido:", { type, data });

    // 1. Valida assinatura (recomendado em produção)
    const isValid = mercadoPagoService.validateWebhookSignature(
      req.headers,
      req.body
    );

    if (!isValid) {
      console.warn("⚠️  Webhook com assinatura inválida");
      // Em produção, retorne 401 ou ignore
    }

    if (type === "payment") {
      const paymentData = await mercadoPagoService.processWebhookNotification({
        type,
        data,
      });

      if (!paymentData) {
        return res.status(200).json({ success: true });
      }

      // Busca doação no banco
      const donation = await donationModel.findByPaymentId(
        paymentData.payment_id.toString()
      );

      if (!donation) {
        console.warn(
          `⚠️  Doação não encontrada para payment_id: ${paymentData.payment_id}`
        );
        return res.status(200).json({ success: true });
      }

      // Atualiza status da doação
      await donationModel.updateStatus(donation.payment_id, paymentData.status);

      if (paymentData.status === "approved") {
        await updateCampanhaDonation(donation.campanha_id, donation);
      }

      console.log(
        `✅ Webhook processado para doação ${donation.payment_id}: ${paymentData.status}`
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.status(200).json({ success: false, error: error.message });
  }
};

async function updateCampanhaDonation(campanha_id, donation) {
  try {
    await campanhaModel.updateCampanha({
      campanha_id,
      value_donated: donation.amount,
    });

    console.log(
      `✅ Campanha ${campanha_id} atualizada com doação de R$ ${donation.amount}`
    );
  } catch (error) {
    console.error("Erro ao atualizar campanha:", error);
  }
}

async function updateCampanhaRefund(campanha_id, amount) {
  try {
    const campanha = await campanhaModel.findById(campanha_id);
    if (campanha) {
      const newValue = Math.max(0, campanha.value_donated - amount);
      await campanhaModel.updateCampanha({
        campanha_id,
        value_donated: newValue,
      });

      console.log(
        `✅ Campanha ${campanha_id} atualizada com reembolso de R$ ${amount}`
      );
    }
  } catch (error) {
    console.error("Erro ao atualizar campanha com reembolso:", error);
  }
}

module.exports = {
  createDonation,
  getUserDonations,
  getCampanhaDonations,
  refundDonation,
  mercadoPagoWebhook,
};
