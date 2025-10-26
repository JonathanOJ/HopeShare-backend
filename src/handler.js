const express = require("express");
const serverless = require("serverless-http");
const multer = require("multer");
const app = express();

const userController = require("./controllers/userController");
const campanhaController = require("./controllers/campanhaController");
const reportController = require("./controllers/reportController");
const depositController = require("./controllers/depositController");
const configReceiptController = require("./controllers/configReceiptController");
const validationUserController = require("./controllers/validationUserController");
const donationController = require("./controllers/donationController");
const bankController = require("./controllers/bankController");
const upload = require("./middleware/uploadMiddleware");

app.post(
  "/validation",
  upload.any(),
  validationUserController.saveValidationUser
);

app.post("/campanha/save", upload.any(), campanhaController.saveCampanha);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ################## Validações de documentos do usuário ###################
app.get("/validation/:user_id", validationUserController.getValidationUser);
app.patch(
  "/validation/admin/:user_id/update",
  validationUserController.updateValidationAdmin
);
app.get(
  "/validation/admin/pending-validations/:user_id",
  validationUserController.getPendingValidations
);

// ################## Rotas de Users ###################
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

// ################## Rotas de campanha ###################
app.get("/campanha/:campanha_id", campanhaController.findById);
app.get("/campanha/findAllByUser/:user_id", campanhaController.findAllByUser);
app.post("/campanha/search", campanhaController.searchCampanhas);
app.delete("/campanha/:campanha_id", campanhaController.deleteCampanha);
app.post("/campanha/:campanha_id/comments", campanhaController.addComment);
app.get("/campanha/:campanha_id/comments", campanhaController.getComments);
app.delete(
  "/campanha/:campanha_id/comments/:comment_id",
  campanhaController.deleteComment
);
app.post("/campanha/report", reportController.reportCampanha);

// ################## Rotas de campanha - Admin ###################
app.patch(
  "/campanha/admin/:user_id/campanhas/:campanha_id/:status",
  campanhaController.updateStatusCampanha
);
app.patch(
  "/campanha/admin/:user_id/campanha/:campanha_id/suspend",
  campanhaController.suspendCampanha
);
app.patch(
  "/campanha/admin/:user_id/campanha/:campanha_id/reactivate",
  campanhaController.reactivateCampanha
);

// ################## Rotas de reports - Admin ###################
app.get("/campanha/admin/:user_id/reports", reportController.getDenuncias);
app.get(
  "/campanha/admin/:user_id/reports-grouped",
  reportController.getDenunciasGrouped
);
app.patch(
  "/campanha/admin/:user_id/reports/:report_id/status",
  reportController.updateDenunciaStatus
);

// ################## Rotas de depositos ###################
app.post(
  "/campanha/deposito/request",
  depositController.createSolicitacaoDeposito
);
app.get(
  "/campanha/depositos/findByUser/:user_id",
  depositController.getMySolicitacoesDeposito
);
app.patch(
  "/campanha/admin/depositos/status",
  depositController.updateSolicitacaoDepositoStatus
);

app.get(
  "/campanha/admin/:user_id/deposito/pending",
  depositController.getSolicitacoesDepositoPendingAdmin
);

// ################## Rotas de configuração de recebimento ###################
app.post("/config/receipt", configReceiptController.saveConfigReceipt);
app.get(
  "/config/receipt/:user_id",
  configReceiptController.getConfigReceiptByUserId
);

// ################## Rotas de Doações - Mercado Pago ###################
app.post("/donations/create", donationController.createDonation);
app.get("/donations/:user_id/user", donationController.getUserDonations);
app.get(
  "/donations/:campanha_id/campanha",
  donationController.getCampanhaDonations
);
app.post("/donations/:payment_id/refund", donationController.refundDonation);

// ################## Webhook Mercado Pago ###################
app.post("/webhooks/mercadopago", donationController.mercadoPagoWebhook);

// ##################  Rotas do bancos ###################
app.post("/banks/search", bankController.searchBanks);
app.get("/banks/:bank_id", bankController.getBankById);

// Middleware de tratamento de erros do Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Arquivo muito grande",
        message: "O arquivo excede o tamanho máximo permitido de 10MB",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Muitos arquivos",
        message: "Você pode enviar no máximo 10 arquivos por vez",
      });
    }
    return res.status(400).json({
      error: "Erro no upload",
      message: error.message,
    });
  }

  if (error) {
    console.error("Erro não tratado:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }

  next();
});

module.exports.handler = serverless(app, {
  binary: true,
  request(request, event, context) {
    request.body = event.body;
    request.isBase64Encoded = event.isBase64Encoded;
  },
});
