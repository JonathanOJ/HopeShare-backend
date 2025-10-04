const express = require("express");
const serverless = require("serverless-http");
const app = express();

const userController = require("./controllers/userController");
const campanhaController = require("./controllers/campanhaController");

app.use(express.json());

// Rotas de Users
app.get("/users/findByEmail/:email", userController.findByEmail);
app.post("/users/signIn", userController.signIn);
app.delete("/users/:user_id", userController.deleteUser);
app.post("/users/save", userController.saveUser);
app.get("/users/findById/:user_id", userController.findById);
app.get(
  "/users/updateUserCampanhasCreated/:user_id",
  userController.updateUserCampanhasCreated
);
app.get(
  "/users/getDetailsCampanhasByUsuarioId/:user_id",
  userController.getDetailsCampanhasByUsuarioId
);

// Rotas de Campanha
app.get("/campanha/:campanha_id", campanhaController.findById);
app.get("/campanha/findAllByUser/:user_id", campanhaController.findAllByUser);
app.post("/campanha/search", campanhaController.searchCampanhas);
app.post("/campanha/save", campanhaController.saveCampanha);
app.delete("/campanha/:campanha_id", campanhaController.deleteCampanha);
app.post("/campanha/donate", campanhaController.donate);

module.exports.handler = serverless(app);
