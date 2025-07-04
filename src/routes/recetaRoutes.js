const express = require('express');
const router = express.Router();
const RecetaController = require('../controllers/recetaController'); 
const authMiddleware = require('../middleware/authMiddleware');
const { uploadRecipeImage } = require('../middleware/uploadMiddleware');

router.post('/crear', authMiddleware, uploadRecipeImage, RecetaController.create);

router.get('/obtener', authMiddleware, RecetaController.getAll);

router.get('/recetas', authMiddleware, RecetaController.getByUsuarioToken);

router.get('/obtener/:id', authMiddleware, RecetaController.getById);

router.put('/actualizar/:id', authMiddleware, uploadRecipeImage, RecetaController.update);

router.delete('/eliminar/:id', authMiddleware, RecetaController.delete);

router.get('/aws-status', authMiddleware, RecetaController.checkAWSStatus);

module.exports = router;