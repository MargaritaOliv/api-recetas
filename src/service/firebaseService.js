// service/firebaseService.js
const admin = require('firebase-admin');
const path = require('path');

// Función para inicializar Firebase
const initializeFirebase = () => {
  try {
    console.log('🔥 Inicializando Firebase Service...');
    
    const serviceAccount = require(path.join(__dirname, '../configs/apprecetas-2d5d3-firebase-adminsdk-fbsvc-817aa0b205.json'));

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK inicializado correctamente');
    } else {
      console.log('✅ Firebase Admin SDK ya estaba inicializado');
    }
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
  }
};

class FirebaseService {
  
  static async enviarATodos(titulo, mensaje, fcmTokens) {
    try {
      const tokensValidos = fcmTokens.filter(token => token && token.trim() !== '');
      
      if (tokensValidos.length === 0) {
        return { 
          success: false, 
          error: 'No hay dispositivos registrados' 
        };
      }

      const message = {
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: {
          tipo: 'admin_message',
          timestamp: Date.now().toString()
        }
      };

      const response = await admin.messaging().sendToDevice(tokensValidos, message);

      console.log('Respuesta Firebase:', response);

      return {
        success: true,
        totalEnviados: response.successCount,
        totalFallidos: response.failureCount,
        detalles: response
      };

    } catch (error) {
      console.error('Error en Firebase:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  static async enviarADispositivo(fcmToken, titulo, mensaje) {
    try {
      const message = {
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: {
          tipo: 'individual',
          timestamp: Date.now().toString()
        },
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      return { success: true, response };
      
    } catch (error) {
      console.error('Error enviando a dispositivo:', error);
      return { success: false, error: error.message };
    }
  }
}

// EXPORTAR AMBOS
module.exports = { FirebaseService, initializeFirebase };