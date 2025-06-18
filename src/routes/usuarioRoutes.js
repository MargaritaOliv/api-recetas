const express = require('express');
const UsuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/obtener', UsuarioController.obtenerUsuarios);

router.get('/obtener/:id', authMiddleware,UsuarioController.obtenerUsuarioPorId);

router.put('/actualizar/:id', authMiddleware,UsuarioController.actualizarUsuario);

router.delete('/eliminar/:id', authMiddleware, UsuarioController.eliminarUsuario);

module.exports = router;
