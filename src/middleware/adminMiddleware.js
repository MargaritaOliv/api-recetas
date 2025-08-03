const jwt = require('jsonwebtoken');
const UsuarioController = require('../controllers/usuarioController');

const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acceso requerido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const usuario = await UsuarioController.obtenerUsuarioPorIdInterno(decoded.id);
    
    if (!usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    if (usuario.rol !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requieren permisos de administrador.' 
      });
    }

    req.usuario = usuario;
    next();

  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

module.exports = adminMiddleware;