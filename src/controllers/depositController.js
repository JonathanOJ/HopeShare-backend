const depositModel = require("../models/depositModel");
const campanhaModel = require("../models/campanhaModel");
const validationUserModel = require("../models/validationUserModel");
const configReceiptModel = require("../models/configReceiptModel");
const userModel = require("../models/userModel");

const createSolicitacaoDeposito = async (req, res) => {
  const { user, campanha } = req.body;

  if (!user || !campanha) {
    return res.status(400).json({ error: "Usuário ou campanha ausente" });
  }

  const campanhaExists = await campanhaModel.findById(campanha.campanha_id);
  if (!campanhaExists) {
    return res.status(404).json({ error: "Campanha não encontrada" });
  }

  const validationUser = await validationUserModel.getValidationUser(
    user.user_id
  );

  if (!validationUser || validationUser.status !== "APPROVED") {
    return res.status(401).json({
      error:
        "Usuário não autorizado a fazer depósitos. Verifique seu status de validação dos documentos.",
    });
  }

  const configReceipt = await configReceiptModel.getConfigReceiptByUserId(
    user.user_id
  );

  if (!configReceipt) {
    return res.status(401).json({
      error:
        "Usuário não possui configuração de recebimento. Por favor, configure antes de solicitar um depósito.",
    });
  }

  campanha.value_donated = campanhaExists.value_donated;

  try {
    const result = await depositModel.createSolicitacaoDeposito(user, campanha);

    await campanhaModel.updateStatusCampanha(campanha.campanha_id, "FINISHED");

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível criar a solicitação de depósito" });
  }
};

const getMySolicitacoesDeposito = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await depositModel.getMySolicitacoesDeposito(user_id);
    res.status(200).json(result ? result.Items : []);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível buscar as solicitações de depósito" });
  }
};

const updateSolicitacaoDepositoStatus = async (req, res) => {
  const { justification_admin, new_status, request_id, user_id } = req.body;

  const userAdmin = await userModel.findById(user_id);
  if (!userAdmin || !userAdmin.admin) {
    return res
      .status(401)
      .json({ error: "Acesso negado. Apenas administradores." });
  }

  if (new_status === "REJECTED" && !justification_admin) {
    return res
      .status(400)
      .json({ error: "Justificativa é obrigatória para rejeição" });
  }

  try {
    const result = await depositModel.updateSolicitacaoDepositoStatus(
      request_id,
      new_status,
      justification_admin
    );

    if (!result) {
      return res
        .status(404)
        .json({ error: "Solicitação de depósito não encontrada" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Não foi possível atualizar o status da solicitação de depósito",
    });
  }
};

const getSolicitacoesDepositoPendingAdmin = async (req, res) => {
  const { user_id } = req.params;

  const userAdmin = await userModel.findById(user_id);
  if (!userAdmin || !userAdmin.admin) {
    return res
      .status(401)
      .json({ error: "Acesso negado. Apenas administradores." });
  }

  try {
    const result = await depositModel.getSolicitacoesDepositoPendingAdmin();
    res.status(200).json(result.Items);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível buscar as solicitações de depósito" });
  }
};

module.exports = {
  createSolicitacaoDeposito,
  getMySolicitacoesDeposito,
  updateSolicitacaoDepositoStatus,
  getSolicitacoesDepositoPendingAdmin,
};
