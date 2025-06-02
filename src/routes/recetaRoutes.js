const express = require('express');
const router = express.Router();
const RecetaController = require('../controllers/recetaController'); 
const authMiddleware = require('../middleware/authMiddleware');

router.post('/crear', authMiddleware,RecetaController.create);

router.get('/obtener', authMiddleware, RecetaController.getAll);

router.get('/recetas', authMiddleware, RecetaController.getByUsuarioToken);

router.get('/obtener/:id', authMiddleware, RecetaController.getById);

router.put('/actualizar/:id', authMiddleware, RecetaController.update);

router.delete('/eliminar/:id', authMiddleware, RecetaController.delete);

module.exports = router;
