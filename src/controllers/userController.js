const userModel = require("../models/userModel");

const findByEmail = async (req, res) => {
  try {
    const result = await userModel.findByEmail(req.params);
    if (result.Items.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const {
      user_id,
      email,
      image = null,
      cnpj = null,
      cpf = null,
      type_user,
      admin,
      username,
    } = result;

    const safeUser = {
      user_id,
      email,
      image,
      cnpj,
      cpf,
      type_user,
      admin,
      username,
    };

    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível buscar usuário" });
  }
};

const findByCnpj = async (req, res) => {
  const { cnpj } = req.params;
  try {
    const result = await userModel.findByCnpj(cnpj);
    if (result.Items.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { password, ...safeUser } = result.Items[0];
    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível buscar usuário" });
  }
};

const findByCpf = async (req, res) => {
  const { cpf } = req.params;
  try {
    const result = await userModel.findByCpf(cpf);
    if (result.Items.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { password, ...safeUser } = result.Items[0];
    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível buscar usuário" });
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
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível buscar usuário" });
  }
};

// User Sign In
const signIn = async (req, res) => {
  try {
    const result = await userModel.signIn(req.body);

    if (!result) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    const {
      user_id,
      email,
      image = null,
      cnpj = null,
      cpf = null,
      type_user,
      admin,
      username,
    } = result;

    const safeUser = {
      user_id,
      email,
      image,
      cnpj,
      cpf,
      type_user,
      admin,
      username,
    };

    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível fazer login" });
  }
};

// Save or Update User
const saveUser = async (req, res) => {
  const { user_id } = req.body;

  if (user_id) {
    try {
      const result = await userModel.updateUser(req.body);

      const { user_id, email, image, type_user, admin } = result;

      const safeUser = {
        user_id,
        email,
        image,
        type_user,
        admin,
      };

      res.status(200).json(safeUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Não foi possível atualizar usuário" });
    }
  } else {
    try {
      const userExists = await userModel.findByEmail(req.body.email);
      if (userExists.Items.length > 0) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      const user_type = req.body.user_type;

      // Verifica se o usuário é do tipo EMPRESA
      if (user_type === 1) {
        const userCnpjExists = await userModel.findByCnpj(req.body.cnpj);
        if (userCnpjExists.Items.length > 0) {
          return res.status(400).json({ error: "CNPJ já está em uso" });
        }
      } else {
        const userCpfExists = await userModel.findByCpf(req.body.cpf);
        if (userCpfExists.Items.length > 0) {
          return res.status(400).json({ error: "CPF já está em uso" });
        }
      }

      const result = await userModel.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Não foi possível criar usuário" });
    }
  }
};

const updateUserCampanhasCreated = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await userModel.updateUserCampanhaCreated(user_id);
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível atualizar usuário" });
  }
};

const deleteUser = async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await userModel.deleteUser(user_id);
    if (result.Attributes) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: "Usuário não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível deletar usuário" });
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
    res.status(500).json({ error: "Não foi possível buscar detalhes" });
  }
};

module.exports = {
  updateUserCampanhasCreated,
  findByEmail,
  findByCnpj,
  findByCpf,
  findById,
  saveUser,
  signIn,
  deleteUser,
  getDetailsCampanhasByUsuarioId,
};
