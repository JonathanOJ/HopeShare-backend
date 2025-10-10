const express = require("express");
const serverless = require("serverless-http");
const app = express();

const userController = require("./controllers/userController");
const campanhaController = require("./controllers/campanhaController");
const reportController = require("./controllers/reportController");
const depositController = require("./controllers/depositController");
const configReceiptController = require("./controllers/configReceiptController");
const validationUserController = require("./controllers/validationUserController");
const donationController = require("./controllers/donationController");
const bankController = require("./controllers/bankController");

app.use(express.json());

// Rotas de Users
app.get("/users/findByEmail/:email", userController.findByEmail);
app.get("/users/findByCnpj/:cnpj", userController.findByCnpj);
app.get("/users/findByCpf/:cpf", userController.findByCpf);
app.post("/users/signIn", userController.signIn);
app.delete("/users/:user_id", userController.deleteUser);
app.post("/users/save", userController.saveUser);
app.get("/users/findById/:user_id", userController.findById);
app.get(
  "/users/updateUserCampanhasCreated/:user_id",
  userController.updateUserCampanhasCreated
);
app.get(
  "/users/getDetailsCampanhasByUsuarioId/:user_id",
  userController.getDetailsCampanhasByUsuarioId
);

// Rotas de Campanha
app.get("/campanha/:campanha_id", campanhaController.findById);
app.get("/campanha/findAllByUser/:user_id", campanhaController.findAllByUser);
app.post("/campanha/search", campanhaController.searchCampanhas);
app.post("/campanha/save", campanhaController.saveCampanha);
app.delete("/campanha/:campanha_id", campanhaController.deleteCampanha);
app.post("/campanha/:campanha_id/comments", campanhaController.addComment);
app.get("/campanha/:campanha_id/comments", campanhaController.getComments);
app.delete(
  "/campanha/:campanha_id/comments/:comment_id",
  campanhaController.deleteComment
);

// Rotas de campanha - Admin
app.patch(
  "/campanha/admin/:user_id/campanhas/:campanha_id/:status",
  campanhaController.updateStatusCampanha
);

// Rotas de reports
app.post("/report", reportController.reportCampanha);

// Rotas de reports - Admin
app.get("/admin/:user_id/reports", reportController.getDenuncias);
app.patch(
  "/admin/:user_id/reports/status",
  reportController.updateDenunciaStatus
);

// Rotas de depositos
app.post(
  "/campanha/deposito/request",
  depositController.createSolicitacaoDeposito
);
app.get(
  "/campanha/depositos/findByUser/:user_id",
  depositController.getMySolicitacoesDeposito
);
app.patch(
  "/campanha/depositos/status",
  depositController.updateSolicitacaoDepositoStatus
);

// Rotas de configuração de recebimento
app.post("/config/receipt", configReceiptController.saveConfigReceipt);
app.get(
  "/config/receipt/:user_id",
  configReceiptController.getConfigReceiptByUserId
);

// Rotas de validação de usuário
app.get("/validation/:user_id", validationUserController.getValidationUser);
app.post("/validation", validationUserController.saveValidationUser);
app.patch(
  "/validation/admin/:user_id/update",
  validationUserController.updateValidationAdmin
);

// Rotas de Doações - Mercado Pago
app.post("/donations/create", donationController.createDonation); // Cria doação e retorna URL de pagamento
app.get("/donations/:user_id/user", donationController.getUserDonations);
app.get(
  "/donations/:campanha_id/campanha",
  donationController.getCampanhaDonations
);
app.post("/donations/:payment_id/refund", donationController.refundDonation);

// Webhook Mercado Pago
app.post("/webhooks/mercadopago", donationController.mercadoPagoWebhook);

// Rotas do bancos
app.post("/banks/search", bankController.searchBanks);
app.get("/banks/:bank_id", bankController.getBankById);

module.exports.handler = serverless(app);
