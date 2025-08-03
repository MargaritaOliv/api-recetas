const FirebaseService = require('../service/firebaseService');
const db = require('../configs/db/db');

class NotificationController {

  // Enviar notificación a todos los usuarios
  static async enviarATodos(req, res) {
    try {
      const { titulo, mensaje } = req.body;

      if (!titulo || !mensaje) {
        return res.status(400).json({
          success: false,
          message: 'Título y mensaje son requeridos'
        });
      }

      // Obtener todos los FCM tokens de usuarios activos
      const query = 'SELECT fcm_token FROM usuarios WHERE fcm_token IS NOT NULL';
      const [rows] = await db.execute(query);
      
      const fcmTokens = rows.map(row => row.fcm_token);

      if (fcmTokens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay dispositivos registrados'
        });
      }

      // Enviar con Firebase
      const resultado = await FirebaseService.enviarATodos(titulo, mensaje, fcmTokens);

      if (resultado.success) {
        // Guardar en historial
        const insertQuery = 'INSERT INTO notificaciones_enviadas (titulo, mensaje, enviado_por) VALUES (?, ?, ?)';
        await db.execute(insertQuery, [titulo, mensaje, req.usuario.id]);

        return res.status(200).json({
          success: true,
          message: `Notificación enviada a ${resultado.totalEnviados} dispositivos`,
          data: {
            enviados: resultado.totalEnviados,
            fallidos: resultado.totalFallidos
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Error enviando notificación',
          error: resultado.error
        });
      }

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Enviar notificación a un dispositivo específico
  static async enviarADispositivo(req, res) {
    try {
      const { titulo, mensaje, fcm_token } = req.body;

      if (!titulo || !mensaje || !fcm_token) {
        return res.status(400).json({
          success: false,
          message: 'Título, mensaje y fcm_token son requeridos'
        });
      }

      // Enviar con Firebase directamente al token
      const resultado = await FirebaseService.enviarADispositivo(fcm_token, titulo, mensaje);

      if (resultado.success) {
        // Guardar en historial
        const insertQuery = 'INSERT INTO notificaciones_enviadas (titulo, mensaje, enviado_por) VALUES (?, ?, ?)';
        await db.execute(insertQuery, [`[Individual] ${titulo}`, mensaje, req.usuario.id]);

        return res.status(200).json({
          success: true,
          message: 'Notificación enviada al dispositivo',
          data: resultado.response
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Error enviando notificación',
          error: resultado.error
        });
      }

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  static async obtenerHistorial(req, res) {
    try {
      const query = `
        SELECT n.*, u.nombre_usuario 
        FROM notificaciones_enviadas n 
        LEFT JOIN usuarios u ON n.enviado_por = u.id 
        ORDER BY n.fecha_envio DESC 
        LIMIT 20
      `;
      
      const [rows] = await db.execute(query);

      return res.status(200).json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo historial'
      });
    }
  }

  // Registrar FCM token (para la app móvil)
  static async registrarToken(req, res) {
    try {
      const { fcm_token } = req.body;
      const usuarioId = req.usuario?.id;

      if (!fcm_token) {
        return res.status(400).json({
          success: false,
          message: 'FCM token requerido'
        });
      }

      // Actualizar token en la BD
      const query = 'UPDATE usuarios SET fcm_token = ? WHERE id = ?';
      await db.execute(query, [fcm_token, usuarioId]);

      return res.status(200).json({
        success: true,
        message: 'Token registrado exitosamente'
      });

    } catch (error) {
      console.error('Error registrando token:', error);
      return res.status(500).json({
        success: false,
        message: 'Error registrando token'
      });
    }
  }
}

module.exports = NotificationController;