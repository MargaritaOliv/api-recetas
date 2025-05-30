const express = require('express');
const UsuarioController = require('../controllers/usuarioController');

const router = express.Router();

router.post('/crear', UsuarioController.crearUsuario);
router.get('/obtener', UsuarioController.obtenerUsuarios);
router.get('/obtener/:id', UsuarioController.obtenerUsuarioPorId);
router.put('/actualizar/:id', UsuarioController.actualizarUsuario);
router.delete('/eliminar/:id', UsuarioController.eliminarUsuario);

module.exports = router;
