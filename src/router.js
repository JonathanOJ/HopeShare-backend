const express = require("express");

const router = express.Router();

const userController = require("./controllers/userController");
const campanhaController = require("./controllers/campanhaController");

router.get("/users/findByEmail/:email", userController.findByEmail);
router.get("/users/findById/:Id", userController.findById);
router.post("/users/signIn", userController.signIn);
router.delete("/users/:id", userController.deleteUser);
router.post("/users/save", userController.saveUser);
router.get(
"/users/updateUserCampanhaCreated/:id",
  userController.updateUserCampanhasCreated
);

router.get("/campanha/:id", campanhaController.findById);
router.get("/campanha/findAllByUser/:id", campanhaController.findAllByUser);
router.post("/campanha/search", campanhaController.searchCampanhas);
router.post("/campanha/save", campanhaController.saveCampanha);

router.delete("/campanha/:id", campanhaController.deleteCampanha);

module.exports = router;
