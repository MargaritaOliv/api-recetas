// test-s3.js - Crear este archivo en la raíz de tu proyecto
require('dotenv').config();
const AWS = require('aws-sdk');

console.log('🔧 Probando configuración AWS S3...\n');

console.log('Variables de entorno:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 10) + '...' : 'NO DEFINIDA');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? process.env.AWS_SECRET_ACCESS_KEY.substring(0, 10) + '...' : 'NO DEFINIDA');
console.log('AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? process.env.AWS_SESSION_TOKEN.substring(0, 20) + '...' : 'NO DEFINIDA');
console.log('AWS_REGION:', process.env.AWS_REGION || 'NO DEFINIDA');
console.log('');

// Configurar S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4'
});

// Probar conexión
async function testS3() {
  try {
    console.log('🔍 Probando listado de buckets...');
    const buckets = await s3.listBuckets().promise();
    console.log('✅ Conexión exitosa!');
    console.log('📦 Buckets encontrados:', buckets.Buckets.map(b => b.Name));
    
    // Verificar si existe tu bucket específico
    const bucketExists = buckets.Buckets.some(b => b.Name === 'mi-app-recetas-2025');
    if (bucketExists) {
      console.log('✅ El bucket "mi-app-recetas-2025" existe');
    } else {
      console.log('❌ El bucket "mi-app-recetas-2025" NO existe');
      console.log('💡 Crea el bucket en la consola de AWS');
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('');
    
    if (error.code === 'InvalidAccessKeyId') {
      console.log('🔑 Problema: AWS_ACCESS_KEY_ID inválido');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.log('🔐 Problema: AWS_SECRET_ACCESS_KEY inválido');
    } else if (error.code === 'TokenRefreshRequired') {
      console.log('⏰ Problema: Las credenciales han expirado');
      console.log('💡 Obtén nuevas credenciales desde AWS Academy');
    } else {
      console.log('🤔 Problema desconocido:', error.code);
    }
  }
}

testS3();