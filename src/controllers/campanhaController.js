const campanhaModel = require("../models/campanhaModel");
const userModel = require("../models/userModel");

const findById = async (req, res) => {
  try {
    const result = await campanhaModel.findById(req.params.campanha_id);
    if (result) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ error: "Campanha not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch campanha" });
  }
};

// Find All Campanhas by User ID
const findAllByUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await campanhaModel.findAllByUser(user_id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch campanhas by user" });
  }
};

// Search Campanhas
const searchCampanhas = async (req, res) => {
  try {
    const result = await campanhaModel.searchCampanhas(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not perform search" });
  }
};

// Create or Update Campanha
const saveCampanha = async (req, res) => {
  try {
    let result;
    if (req.body.campanha_id != "") {
      result = await campanhaModel.updateCampanha(req.body);
    } else {
      result = await campanhaModel.createCampanha(req.body);

      if (result.campanha_id) {
        await userModel.updateUserCampanhaCreated(
          req.body.user_responsable.user_id
        );
      }
    }
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
};

// Delete Campanha
const deleteCampanha = async (req, res) => {
  const { campanha_id } = req.params;
  const campanha = await campanhaModel.findById(campanha_id);

  if (campanha.value_donated > 0) {
    return res.status(400).json({ error: "Campanha have donations!" });
  }

  try {
    const result = await campanhaModel.deleteCampanha(campanha_id);
    res.status(200).json({ success: result.Attributes ? true : false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete campanha" });
  }
};

// Donate
const donate = async (req, res) => {
  try {
    const result = await campanhaModel.donate(req.body);

    if (result) {
      const userAlreadyDonated = result.users_donated.filter(
        (user) => user.user_id === req.body.user_id
      );

      if (userAlreadyDonated.length === 1) {
        await userModel.updateTotalCampanhasDonated(req.body);
      }

      await userModel.updateTotalDonated(req.body);
    }

    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not donate" });
  }
};

module.exports = {
  searchCampanhas,
  findById,
  findAllByUser,
  saveCampanha,
  deleteCampanha,
  donate,
};
