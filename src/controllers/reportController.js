const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");
const campanhaModel = require("../models/campanhaModel");

const reportCampanha = async (req, res) => {
  const { user, reason, description, campanha } = req.body;

  if (!user || !reason || !description || !campanha) {
    return res
      .status(400)
      .json({ error: "Faltando usuário, motivo, descrição ou campanha" });
  }

  const safeUser = {
    user_id: user.user_id,
    username: user.username,
    image: user.image || null,
    email: user.email,
  };

  try {
    const result = await reportModel.reportCampanha(
      campanha,
      safeUser,
      reason,
      description
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível denunciar a campanha" });
  }
};

const getDenuncias = async (req, res) => {
  const { user_id } = req.params;

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.admin) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  try {
    const result = await reportModel.getDenuncias();

    result.Items.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.status(200).json(result.Items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível buscar as denúncias" });
  }
};

const getDenunciasGrouped = async (req, res) => {
  const { user_id } = req.params;

  try {
    const adminUser = await userModel.findById(user_id);
    if (!adminUser || !adminUser.admin) {
      return res.status(401).json({ error: "Acesso negado" });
    }

    const result = await reportModel.getDenuncias();

    result.Items.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const campanhasMap = new Map();

    for (const denuncia of result.Items) {
      if (!denuncia.campanha || !denuncia.campanha.campanha_id) continue;

      const campanha_id = denuncia.campanha.campanha_id;

      if (!campanhasMap.has(campanha_id)) {
        campanhasMap.set(campanha_id, {
          campanha_id: campanha_id,
          campanha_title: "",
          total_denuncias: 0,
          denuncias_pendentes: 0,
          denuncias_analisadas: 0,
          denuncias_resolvidas: 0,
          is_suspended: false,
          denuncias: [],
          expanded: false,
        });
      }

      const campanha = campanhasMap.get(campanha_id);

      campanha.denuncias.push(denuncia);
      campanha.total_denuncias++;

      switch (denuncia.status) {
        case "PENDING":
          campanha.denuncias_pendentes++;
          break;
        case "ANALYZED":
          campanha.denuncias_analisadas++;
          break;
        case "RESOLVED":
          campanha.denuncias_resolvidas++;
          break;
      }
    }

    const campanhasIds = Array.from(campanhasMap.keys());

    const campanhas = await campanhaModel.findAllByIds(campanhasIds);

    for (const campanha of campanhas) {
      const campanhaData = campanhasMap.get(campanha.campanha_id);
      if (campanhaData) {
        campanhaData.campanha_title = campanha.title;
        campanhaData.is_suspended = campanha.status === "SUSPENDED";
      }
    }

    return res.status(200).json(Array.from(campanhasMap.values()));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Não foi possível buscar as denúncias agrupadas",
    });
  }
};

const updateDenunciaStatus = async (req, res) => {
  const { user_id, report_id } = req.params;

  const adminUser = await userModel.findById(user_id);
  if (!adminUser || !adminUser.admin) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Faltando status" });
  }

  try {
    const result = await reportModel.updateDenunciaStatus(report_id, status);
    res.status(200).json(result.Attributes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível atualizar o status da denúncia" });
  }
};

module.exports = {
  reportCampanha,
  getDenuncias,
  getDenunciasGrouped,
  updateDenunciaStatus,
};
