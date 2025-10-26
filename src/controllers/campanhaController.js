const campanhaModel = require("../models/campanhaModel");
const userModel = require("../models/userModel");

const findById = async (req, res) => {
  try {
    const result = await campanhaModel.findById(req.params.campanha_id);
    if (result) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível buscar campanha" });
  }
};

const findAllByUser = async (req, res) => {
  const { user_id } = req.params;
  const { with_comments } = req.query;

  try {
    const withComments = with_comments === "true";
    const result = await campanhaModel.findAllByUser(user_id, withComments);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível buscar campanhas do usuário" });
  }
};

const searchCampanhas = async (req, res) => {
  try {
    const result = await campanhaModel.searchCampanhas(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível realizar a busca" });
  }
};

// Create or Update Campanha
const saveCampanha = async (req, res) => {
  const { campanha_id, status } = req.body;

  if (campanha_id && status !== "ACTIVE") {
    res.status(400).json({
      error: "Campanha só pode ser atualizada se estiver com status ATIVA",
    });
    return;
  }

  try {
    let result;

    try {
      const imageFile = req.files?.find(
        (f) => f.fieldname === "new_file_image"
      );

      req.body.image = req.body.image ? JSON.parse(req.body.image) : null;
      req.body.user_responsable = JSON.parse(req.body.user_responsable);
      req.body.category = JSON.parse(req.body.category);
      req.body.value_required = Number(req.body.value_required);
      req.body.address = req.body.address ? JSON.parse(req.body.address) : null;
      req.body.have_address = req.body.have_address === "true";
      req.body.emergency = req.body.emergency === "true";

      if (imageFile) {
        req.body.new_file_image = imageFile;
      }
    } catch (e) {
      console.error(
        "Erro ao fazer parse da imagem, usuário responsável, categoria ou endereço:",
        e
      );
      throw new Error("Erro ao processar os dados enviados");
    }

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
      .json({ error: "Ocorreu um erro ao processar a solicitação" });
  }
};

const deleteCampanha = async (req, res) => {
  const { campanha_id } = req.params;
  const campanha = await campanhaModel.findById(campanha_id);

  if (campanha.value_donated > 0) {
    return res.status(400).json({
      error: "Não é possível deletar a campanha, pois possui doações!",
    });
  }

  try {
    const result = await campanhaModel.deleteCampanha(campanha_id);
    res.status(200).json({ success: result.Attributes ? true : false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível deletar a campanha" });
  }
};

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
    res.status(500).json({ error: "Não foi possível realizar a doação" });
  }
};

const addComment = async (req, res) => {
  const { campanha_id } = req.params;

  const { user_id, comment } = req.body;

  if (!user_id || !comment) {
    return res.status(400).json({ error: "Faltando usuário ou comentário" });
  }

  try {
    const user = await userModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const result = await campanhaModel.addComment(campanha_id, user, comment);
    res.status(200).json(result.Attributes || result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível adicionar o comentário" });
  }
};

const getComments = async (req, res) => {
  const { campanha_id } = req.params;

  try {
    const result = await campanhaModel.getComments(campanha_id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível recuperar os comentários" });
  }
};

const deleteComment = async (req, res) => {
  const { campanha_id, comment_id } = req.params;

  try {
    const result = await campanhaModel.deleteComment(campanha_id, comment_id);
    res.status(200).json({ success: result ? true : false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível deletar o comentário" });
  }
};

// ################## Admin ###################
const updateStatusCampanha = async (req, res) => {
  const { campanha_id, user_id, status } = req.params;

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.admin) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  try {
    const result = await campanhaModel.updateStatusCampanha(
      campanha_id,
      status
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível alterar o status da campanha" });
  }
};

const suspendCampanha = async (req, res) => {
  const { campanha_id, user_id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: "Motivo da suspensão é obrigatório" });
  }

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.admin) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  try {
    const result = await campanhaModel.suspendCampanha(campanha_id, reason);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível suspender a campanha" });
  }
};

const reactivateCampanha = async (req, res) => {
  const { campanha_id, user_id } = req.params;

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.admin) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  try {
    const result = await campanhaModel.reactivateCampanha(campanha_id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível reativar a campanha" });
  }
};

module.exports = {
  searchCampanhas,
  findById,
  findAllByUser,
  saveCampanha,
  deleteCampanha,
  donate,
  addComment,
  getComments,
  deleteComment,
  updateStatusCampanha,
  suspendCampanha,
  reactivateCampanha,
};
