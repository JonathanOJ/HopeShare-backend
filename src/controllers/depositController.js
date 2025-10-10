const depositModel = require("../models/depositModel");
const campanhaModel = require("../models/campanhaModel");

const createSolicitacaoDeposito = async (req, res) => {
  const { user, campanha, request_message } = req.body;

  if (!user || !campanha) {
    return res.status(400).json({ error: "Missing user or campanha" });
  }

  const campanhaExists = await campanhaModel.findById(campanha.campanha_id);
  if (!campanhaExists) {
    return res.status(404).json({ error: "Campanha not found" });
  }

  campanha.value_donated = campanhaExists.value_donated;

  try {
    const result = await depositModel.createSolicitacaoDeposito(
      user,
      campanha,
      request_message
    );

    await campanhaModel.updateStatusCampanha(campanha.campanha_id, "FINISHED");

    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create deposit request" });
  }
};

const getMySolicitacoesDeposito = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await depositModel.getMySolicitacoesDeposito(user_id);
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not retrieve deposit requests" });
  }
};

const updateSolicitacaoDepositoStatus = async (req, res) => {
  const { justification_admin, newStatus, request_id } = req.body;

  if (newStatus === "REJECTED" && !justification_admin) {
    return res
      .status(400)
      .json({ error: "Justification is required for rejection" });
  }

  try {
    const result = await depositModel.updateSolicitacaoDepositoStatus(
      request_id,
      newStatus,
      justification_admin
    );

    if (!result) {
      return res.status(404).json({ error: "Deposit request not found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update deposit request status" });
  }
};

module.exports = {
  createSolicitacaoDeposito,
  getMySolicitacoesDeposito,
  updateSolicitacaoDepositoStatus,
};
