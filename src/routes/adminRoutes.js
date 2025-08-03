const express = require('express');
const UsuarioController = require('../controllers/usuarioController');
const NotificationController = require('../controllers/notificationController');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/usuarios', adminMiddleware, UsuarioController.obtenerUsuarios);
router.delete('/usuarios/:id', adminMiddleware, UsuarioController.eliminarUsuario);

router.post('/notifications/enviar', adminMiddleware, NotificationController.enviarATodos);
router.post('/notifications/enviar-individual', adminMiddleware, NotificationController.enviarADispositivo);
router.get('/notifications/historial', adminMiddleware, NotificationController.obtenerHistorial);

module.exports = router;