const reportModel = require("../models/reportModel");
const campanhaModel = require("../models/campanhaModel");
const userModel = require("../models/userModel");

// Report Campanha
const reportCampanha = async (req, res) => {
  const { user, reason, description, campanha_id } = req.body;

  if (!user || !reason || !description) {
    return res
      .status(400)
      .json({ error: "Missing user, reason or description" });
  }

  try {
    const result = await reportModel.reportCampanha(
      campanha_id,
      user,
      reason,
      description
    );
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not report campanha" });
  }
};

const getDenuncias = async (req, res) => {
  const { user_id } = req.params;

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const result = await reportModel.getDenuncias();
    res.status(200).json(result.Items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not retrieve reports" });
  }
};

const updateDenunciaStatus = async (req, res) => {
  const { user_id } = req.params;

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Missing status" });
  }

  try {
    const result = await reportModel.updateDenunciaStatus(report_id, status);
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update report status" });
  }
};

module.exports = {
  reportCampanha,
  getDenuncias,
  updateDenunciaStatus,
};
