const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION || 'us-east-1'
});

const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'mi-app-recetas-2025',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = `${Date.now()}-${uuidv4()}.${file.originalname.split('.').pop()}`;
      
      if (req.route.path.includes('receta')) {
        cb(null, `recetas/${fileName}`);
      } else if (req.route.path.includes('usuario')) {
        cb(null, `usuarios/${fileName}`);
      } else {
        cb(null, `uploads/${fileName}`);
      }
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

module.exports = { uploadToS3, s3 };