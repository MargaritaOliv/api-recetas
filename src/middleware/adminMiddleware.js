const jwt = require('jsonwebtoken');
const db = require('../configs/db/db');

const adminMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acceso requerido' 
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Obtener usuario de la base de datos directamente
    const query = 'SELECT * FROM usuarios WHERE id = ?';
    const [rows] = await db.execute(query, [decoded.id]);
    
    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    const usuario = rows[0];

    // Verificar que sea admin
    if (usuario.rol !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requieren permisos de administrador.' 
      });
    }

    // Agregar usuario a la request
    req.usuario = usuario;
    next();

  } catch (error) {
    console.error('Error en adminMiddleware:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

module.exports = adminMiddleware;