const express = require('express');
const router = express.Router();
const RecetaController = require('../controllers/recetaControllers'); 

router.post('/crear', RecetaController.create);

router.get('/obtener', RecetaController.getAll);

router.get('/obtener/:id', RecetaController.getById);

router.put('/actualizar/:id', RecetaController.update);

router.delete('/eliminar/:id', RecetaController.delete);

module.exports = router;
