const configReceiptModel = require("../models/configReceiptModel");
const userModel = require("../models/userModel");

// Create Config Receipt
const saveConfigReceipt = async (req, res) => {
  try {
    const { user_id } = req.body;
    const existingConfig = await configReceiptModel.getConfigReceiptByUserId(
      user_id
    );

    const user = await userModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
        user.cnpj_verified
      );
    }
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save config receipt" });
  }
};

// Get Config Receipt by User ID
const getConfigReceiptByUserId = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await configReceiptModel.getConfigReceiptByUserId(user_id);

    const user = await userModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    result.cnpj_verified = user.cnpj_verified;

    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: "Config receipt not found for this user" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch config receipt by user" });
  }
};

module.exports = {
  saveConfigReceipt,
  getConfigReceiptByUserId,
};
