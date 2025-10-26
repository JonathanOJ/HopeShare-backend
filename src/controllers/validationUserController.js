const validationUserModel = require("../models/validationUserModel");
const userModel = require("../models/userModel");

const getValidationUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await validationUserModel.getValidationUser(user_id);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível buscar validação do usuário" });
  }
};

const saveValidationUser = async (req, res) => {
  try {
    let { user, company_name, cnpj, observation } = req.body;

    if (!user) {
      return res.status(400).json({ error: "user é obrigatório" });
    }

    if (typeof user === "string") {
      try {
        user = JSON.parse(user);
      } catch (e) {
        console.error("Erro ao fazer parse do user:", e);
        throw new Error("Formato inválido para o campo user");
      }
    }

    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "documents") {
          documents.push({
            name: file.originalname,
            type: file.mimetype,
            file: file.buffer,
          });
        }
      });
    }

    const validationData = {
      user,
      company_name,
      cnpj,
      observation: observation || "",
      documents,
    };

    const existingValidation = await validationUserModel.getValidationUser(
      user.user_id
    );

    let result;

    if (existingValidation) {
      result = await validationUserModel.updateValidationUser(
        user.user_id,
        validationData
      );

      return res.status(200).json({
        message: "Registro de validação atualizado. Aguardando revisão.",
        data: result,
      });
    }

    result = await validationUserModel.createValidationUser(validationData);
    res.status(201).json({
      message: "Validação criada com sucesso",
      data: result,
    });
  } catch (error) {
    console.error("Erro em saveValidationUser:", error);
    res.status(500).json({
      error: "Não foi possível processar a validação",
      details: error.message,
    });
  }
};

const updateValidationAdmin = async (req, res) => {
  try {
    const { status, observation, validation_id } = req.body;
    const { user_id } = req.params;

    const adminUser = await userModel.findById(user_id);
    if (!adminUser || !adminUser.admin) {
      return res
        .status(401)
        .json({ error: "Acesso negado. Apenas administradores." });
    }

    const existingValidation = await validationUserModel.getValidationById(
      validation_id
    );

    if (!existingValidation) {
      return res
        .status(404)
        .json({ error: "Registro de validação não encontrado" });
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
    res
      .status(500)
      .json({ error: "Não foi possível atualizar o registro de validação" });
  }
};

const getPendingValidations = async (req, res) => {
  try {
    const { user_id } = req.params;

    const adminUser = await userModel.findById(user_id);
    if (!adminUser || !adminUser.admin) {
      return res
        .status(401)
        .json({ error: "Acesso negado. Apenas administradores." });
    }

    const pendingValidations =
      await validationUserModel.getPendingValidations();

    res.status(200).json(pendingValidations);
  } catch (error) {
    console.error("Erro ao buscar validações pendentes:", error);
    res
      .status(500)
      .json({ error: "Não foi possível buscar validações pendentes" });
  }
};

module.exports = {
  getValidationUser,
  saveValidationUser,
  updateValidationAdmin,
  getPendingValidations,
};
