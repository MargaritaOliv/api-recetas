const admin = require('firebase-admin');

const serviceAccount = require('../config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

class NotificationService {
  
  static async enviarADispositivo(fcmToken, titulo, mensaje, datos = {}) {
    try {
      const message = {
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: datos, 
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Notificación enviada exitosamente:', response);
      return { success: true, response };
    } catch (error) {
      console.error('Error enviando notificación:', error);
      return { success: false, error: error.message };
    }
  }

  static async enviarATodosLosUsuarios(titulo, mensaje, fcmTokens, datos = {}) {
    try {
      const tokensValidos = fcmTokens.filter(token => token && token.trim() !== '');
      
      if (tokensValidos.length === 0) {
        return { success: false, error: 'No hay dispositivos registrados' };
      }

      const message = {
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: datos,
      };

      const batches = [];
      const batchSize = 500;
      
      for (let i = 0; i < tokensValidos.length; i += batchSize) {
        const batch = tokensValidos.slice(i, i + batchSize);
        batches.push(batch);
      }

      const resultados = [];
      
      for (const batch of batches) {
        const multicastMessage = {
          ...message,
          tokens: batch,
        };

        const response = await admin.messaging().sendMulticast(multicastMessage);
        resultados.push(response);
        
        console.log(`Batch enviado: ${response.successCount}/${batch.length} exitosos`);
      }

      const totalExitosos = resultados.reduce((sum, result) => sum + result.successCount, 0);
      const totalFallidos = resultados.reduce((sum, result) => sum + result.failureCount, 0);

      return {
        success: true,
        totalEnviados: totalExitosos,
        totalFallidos: totalFallidos,
        detalles: resultados
      };

    } catch (error) {
      console.error('Error enviando notificaciones masivas:', error);
      return { success: false, error: error.message };
    }
  }

  static async enviarPorTema(tema, titulo, mensaje, datos = {}) {
    try {
      const message = {
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: datos,
        topic: tema, 
      };

      const response = await admin.messaging().send(message);
      return { success: true, response };
    } catch (error) {
      console.error('Error enviando por tema:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;