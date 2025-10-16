const configReceiptModel = require("../models/configReceiptModel");
const userModel = require("../models/userModel");
const validationUserModel = require("../models/validationUserModel");

const saveConfigReceipt = async (req, res) => {
  try {
    const { user_id } = req.body;
    const existingConfig = await configReceiptModel.getConfigReceiptByUserId(
      user_id
    );

    const user = await userModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    let result;

    if (existingConfig) {
      result = await configReceiptModel.updateConfigReceipt(
        existingConfig.config_id,
        req.body
      );
    } else {
      result = await configReceiptModel.saveConfigReceipt(
        req.body,
        user.cnpj_verified || false
      );
    }
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível salvar configuração de recebimento" });
  }
};

const getConfigReceiptByUserId = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await configReceiptModel.getConfigReceiptByUserId(user_id);

    if (!result) {
      return res.status(200).json(null);
    }

    const userValidation = await validationUserModel.getValidationUser(user_id);

    result.cnpj_verified = userValidation
      ? userValidation.status === "APPROVED" || false
      : false;

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Não foi possível buscar configuração de recebimento do usuário",
    });
  }
};

module.exports = {
  saveConfigReceipt,
  getConfigReceiptByUserId,
};
