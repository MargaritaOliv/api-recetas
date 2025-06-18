const express = require('express');
const UsuarioController = require('../controllers/usuarioController');
const routerAuth = express.Router();


routerAuth.post('/register', UsuarioController.registrarUsuario);

routerAuth.post('/login', UsuarioController.login);

module.exports = routerAuth;