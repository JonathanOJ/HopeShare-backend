const userModel = require("../models/userModel");

// Find User by Email
const findByEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const result = await userModel.findByEmail(email);
    if (result.Items.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password, ...safeUser } = result.Items[0];
    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not find user" });
  }
};
const findById = async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await userModel.findById(user_id);
    if (result) {
      const { password, ...safeUser } = result;
      return res.status(200).json(safeUser);
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch user" });
  }
};

// User Sign In
const signIn = async (req, res) => {
  try {
    const result = await userModel.signIn(req.body);

    if (!result) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const {
      user_id,
      email,
      image = null,
      cnpj = null,
      cpf = null,
      type_user,
      is_admin,
    } = result;

    const safeUser = {
      user_id,
      email,
      image,
      cnpj,
      cpf,
      type_user,
      is_admin,
    };

    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not sign in" });
  }
};

// Save or Update User
const saveUser = async (req, res) => {
  const { user_id } = req.body;

  if (user_id) {
    try {
      const result = await userModel.updateUser(req.body);

      const {
        user_id,
        email,
        image = null,
        cnpj = null,
        cpf = null,
        type_user,
        is_admin,
      } = result;

      const safeUser = {
        user_id,
        email,
        image,
        cnpj,
        cpf,
        type_user,
        is_admin,
      };

      res.status(200).json(safeUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not update user" });
    }
  } else {
    try {
      const result = await userModel.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not create user" });
    }
  }
};

// Update User Campanha Created
const updateUserCampanhasCreated = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await userModel.updateUserCampanhaCreated(user_id);
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update user" });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await userModel.deleteUser(user_id);
    if (result.Attributes) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete user" });
  }
};

// Get Details Campanhas By UsuarioId
const getDetailsCampanhasByUsuarioId = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await userModel.getDetailsCampanhasByUsuarioId(user_id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch details" });
  }
};

module.exports = {
  updateUserCampanhasCreated,
  findByEmail,
  findById,
  saveUser,
  signIn,
  deleteUser,
  getDetailsCampanhasByUsuarioId,
};
