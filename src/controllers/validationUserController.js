const validationUserModel = require("../models/validationUserModel");
const userModel = require("../models/userModel");

// Get Validation User by User ID
const getValidationUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await validationUserModel.getValidationUser(user_id);

    if (result) {
      res.status(200).json(result);
    } else {
      res
        .status(404)
        .json({ error: "Validation record not found for this user" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Could not fetch validation user by user ID" });
  }
};

// Save Validation User
const saveValidationUser = async (req, res) => {
  try {
    const { user_id } = req.body;
    const existingValidation = await validationUserModel.getValidationUser(
      user_id
    );

    const user = await userModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let result;

    if (existingValidation) {
      result = await validationUserModel.updateValidationUser(
        user_id,
        req.body
      );
      return res
        .status(200)
        .json({ message: "Validation record updated. Awaiting review." });
    }

    result = await validationUserModel.createValidationUser(req.body);

    res.status(201).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create validation user" });
  }
};

// Update Validation User by Admin
const updateValidationAdmin = async (req, res) => {
  try {
    const { status, observation, validation_id } = req.body;
    const { user_id } = req.params;

    const adminUser = await userModel.findById(user_id);
    if (!adminUser || !adminUser.is_admin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const existingValidation = await validationUserModel.getValidationById(
      validation_id
    );

    if (!existingValidation) {
      return res.status(404).json({ error: "Validation record not found" });
    }

    const result = await validationUserModel.updateValidationAdmin(
      validation_id,
      {
        status,
        observation,
      }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update validation record" });
  }
};

module.exports = {
  getValidationUser,
  saveValidationUser,
  updateValidationAdmin,
  updateValidationAdmin,
};
