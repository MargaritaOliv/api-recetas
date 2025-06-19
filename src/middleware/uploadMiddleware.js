// src/middleware/uploadMiddleware.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// Función para crear configuración S3 dinámicamente
const createS3Instance = () => {
  console.log('🔧 Creando nueva instancia de S3...');
  
  // Configurar AWS S3 con credenciales actuales
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION || 'us-east-1'
  });

  return new AWS.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4'
  });
};

// Función para crear el middleware de upload dinámicamente
const createUploadMiddleware = () => {
  console.log('🔧 Creando middleware de upload...');
  
  return multer({
    storage: multerS3({
      s3: createS3Instance(), // Crear instancia fresca cada vez
      bucket: 'mi-app-recetas-2025',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: function (req, file, cb) {
        cb(null, { 
          fieldName: file.fieldname,
          originalName: file.originalname 
        });
      },
      key: function (req, file, cb) {
        try {
          const fileExtension = file.originalname.split('.').pop().toLowerCase();
          const fileName = `${Date.now()}-${uuidv4()}.${fileExtension}`;
          
          // Determinar carpeta basada en la ruta
          let folder = 'uploads';
          if (req.route && req.route.path) {
            if (req.route.path.includes('receta')) {
              folder = 'recetas';
            } else if (req.route.path.includes('usuario')) {
              folder = 'usuarios';
            }
          }
          
          const key = `${folder}/${fileName}`;
          console.log(`📁 Subiendo archivo: ${key}`);
          cb(null, key);
        } catch (error) {
          console.error('Error generando key:', error);
          cb(error);
        }
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      console.log(`📄 Procesando archivo: ${file.originalname}, tipo: ${file.mimetype}`);
      
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
      }
    }
  });
};

// Función para probar la conexión con S3
const testS3Connection = async () => {
  try {
    console.log('🔍 Probando conexión S3...');
    const s3 = createS3Instance();
    const result = await s3.listBuckets().promise();
    console.log('✅ S3 conectado, buckets encontrados:', result.Buckets.map(b => b.Name));
    return true;
  } catch (error) {
    console.error('❌ Error de conexión S3:', error.message);
    console.error('Código de error:', error.code);
    return false;
  }
};

// Función para eliminar archivo de S3
const deleteFromS3 = async (key) => {
  try {
    const s3 = createS3Instance();
    await s3.deleteObject({
      Bucket: 'mi-app-recetas-2025',
      Key: key
    }).promise();
    console.log(`🗑️ Archivo eliminado de S3: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Error eliminando archivo ${key}:`, error.message);
    return false;
  }
};

const uploadToS3 = createUploadMiddleware();
const s3 = createS3Instance();

module.exports = { 
  uploadToS3, 
  s3,
  createS3Instance,
  createUploadMiddleware,
  testS3Connection,
  deleteFromS3 
};