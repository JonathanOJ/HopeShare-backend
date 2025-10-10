const bankModel = require("../models/bankModel");

const searchBanks = async (req, res) => {
  try {
    const result = await bankModel.searchBanks(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not perform search" });
  }
};

const getBankById = async (req, res) => {
  try {
    const result = await bankModel.getBankById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not retrieve bank" });
  }
};

module.exports = {
  searchBanks,
  getBankById,
};
