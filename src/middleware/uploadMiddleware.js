// src/middleware/uploadMiddleware.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN, // Importante para AWS Academy
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4' // Agregar esto para compatibilidad
});

// Configurar multer con S3
const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'mi-app-recetas-2025', // Tu bucket name
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Generar nombre único para el archivo
      const fileName = `${Date.now()}-${uuidv4()}.${file.originalname.split('.').pop()}`;
      
      // Organizar por carpetas según el tipo
      if (req.route.path.includes('receta')) {
        cb(null, `recetas/${fileName}`);
      } else if (req.route.path.includes('usuario')) {
        cb(null, `usuarios/${fileName}`);
      } else {
        cb(null, `uploads/${fileName}`);
      }
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

const testS3Connection = async () => {
  try {
    await s3.listBuckets().promise();
    console.log('✅ Conexión con S3 exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión con S3:', error.message);
    return false;
  }
};

module.exports = { uploadToS3, s3, testS3Connection };