const {
  MercadoPagoConfig,
  Payment,
  Preference,
  PaymentRefund,
} = require("mercadopago");

// Configuração do cliente Mercado Pago
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const isTestMode = accessToken?.startsWith("TEST-");

console.log(
  `🔑 Mercado Pago configurado em modo: ${isTestMode ? "TESTE" : "PRODUÇÃO"}`
);

const client = new MercadoPagoConfig({
  accessToken: accessToken,
});

const payment = new Payment(client);
const preference = new Preference(client);
const paymentRefund = new PaymentRefund(client);

const createPayment = async (donationData) => {
  const {
    transaction_amount,
    description,
    payment_method_id,
    payer,
    token,
    installments = 1,
    metadata,
  } = donationData;

  try {
    const paymentData = {
      transaction_amount: parseFloat(transaction_amount),
      description,
      payment_method_id,
      installments: parseInt(installments),
      token,
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
          ? {
              type: payer.identification.type,
              number: payer.identification.number,
            }
          : undefined,
      },
      notification_url: metadata?.notification_url,
      metadata: metadata || {},
    };

    const result = await payment.create({ body: paymentData });

    return result;
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    throw new Error(`Falha ao criar pagamento: ${error.message}`);
  }
};

const createPaymentPreference = async (preferenceData) => {
  const { items, payer, metadata, external_reference } = preferenceData;

  try {
    const preferencePayload = {
      items: items.map((item) => ({
        title: item.title,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        currency_id: item.currency_id || "BRL",
      })),
      payer: payer && payer.email ? payer : undefined,
      back_urls: {
        success: `${process.env.FRONTEND_URL}/donation/success`,
        failure: `${process.env.FRONTEND_URL}/donation/failure`,
        pending: `${process.env.FRONTEND_URL}/donation/pending`,
      },
      notification_url: `${process.env.API_URL}/webhooks/mercadopago`,
      external_reference,
      metadata,
    };

    const result = await preference.create({ body: preferencePayload });

    return result;
  } catch (error) {
    console.error("❌ Erro ao criar preferência:", error);
    throw new Error(`Falha ao criar preferência: ${error.message}`);
  }
};

const getPayment = async (paymentId) => {
  try {
    const result = await payment.get({ id: paymentId });
    return result;
  } catch (error) {
    console.error(`❌ Erro ao buscar pagamento ${paymentId}:`, error);
    throw new Error(`Falha ao buscar pagamento: ${error.message}`);
  }
};

const refundPayment = async (paymentId, amount = null) => {
  try {
    const refundOptions = {
      payment_id: paymentId,
    };

    if (amount) {
      refundOptions.body = {
        amount: parseFloat(amount),
      };
    } else {
      refundOptions.body = {};
    }

    const result = await paymentRefund.create(refundOptions);

    return result;
  } catch (error) {
    console.error(`❌ Erro ao reembolsar pagamento ${paymentId}:`, error);
    throw new Error(`Falha ao reembolsar: ${error.message}`);
  }
};

const cancelPayment = async (paymentId) => {
  try {
    const result = await payment.cancel({
      id: paymentId,
    });
    return result;
  } catch (error) {
    console.error(`❌ Erro ao cancelar pagamento ${paymentId}:`, error);
    throw new Error(`Falha ao cancelar: ${error.message}`);
  }
};

// Valida assinatura do webhook
const validateWebhookSignature = (headers, body) => {
  const signature = headers["x-signature"];
  const requestId = headers["x-request-id"];

  if (!signature || !requestId) {
    console.warn("⚠️  Webhook sem assinatura válida");
    return false;
  }

  return true;
};

// Processa notificação do webhook
const processWebhookNotification = async (notification) => {
  const { topic, resource } = notification;

  try {
    if (topic === "payment") {
      const payment_id = resource;
      const paymentData = await getPayment(payment_id);

      return {
        payment_id: payment_id,
        status: paymentData.status,
        transaction_amount: paymentData.transaction_amount,
        external_reference: paymentData.external_reference,
        date_approved: paymentData.date_approved,
        payment_method_id: paymentData.payment_method_id,
        metadata: paymentData.metadata,
      };
    }

    console.warn(`⚠️  Tipo de notificação não suportado: ${topic}`);
    return null;
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    throw error;
  }
};

module.exports = {
  createPayment,
  createPaymentPreference,
  getPayment,
  refundPayment,
  cancelPayment,
  validateWebhookSignature,
  processWebhookNotification,
};
